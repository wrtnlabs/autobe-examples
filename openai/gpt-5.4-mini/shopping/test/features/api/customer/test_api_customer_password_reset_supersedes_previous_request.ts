import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerPasswordReset";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_password_resets_create } from "../../../generate/generate_random_mall_platform_customer_password_resets_create";
import { prepare_random_mall_platform_customer_password_reset } from "../../../prepare/prepare_random_mall_platform_customer_password_reset";

/**
 * Verify that repeated customer password reset requests supersede earlier active recovery records.
 *
 * This test validates the password reset initiation flow for an eligible customer who requests recovery more than once. It confirms that both requests succeed in sequence, that each response is a valid password reset record, and that the later request produces a new reset identifier for the same customer account.
 *
 * Because the public DTO only exposes the reset id, email, and updated timestamp, the test focuses on the observable API contract rather than internal recovery-state storage. It ensures the operation remains safe for repeated submission and that the newest reset request is distinct from the earlier one.
 *
 * 1. Register an authenticated customer account for recovery testing.
 * 2. Submit the first password reset request for that customer.
 * 3. Submit a second password reset request for the same customer.
 * 4. Validate both responses belong to the same customer and that the later request produces a different reset record identifier.
 */
export async function test_api_customer_password_reset_supersedes_previous_request(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(joined);
  const firstReset =
    await generate_random_mall_platform_customer_password_resets_create(
      customerConnection,
      {
        body: {
          mall_platform_customer_id: joined.id,
        } satisfies IMallPlatformCustomerPasswordReset.ICreate,
      },
    );
  typia.assert(firstReset);
  const secondReset =
    await generate_random_mall_platform_customer_password_resets_create(
      customerConnection,
      {
        body: {
          mall_platform_customer_id: joined.id,
        } satisfies IMallPlatformCustomerPasswordReset.ICreate,
      },
    );
  typia.assert(secondReset);
  TestValidator.equals(
    "first reset belongs to the joined customer",
    firstReset.email,
    joined.email,
  );
  TestValidator.equals(
    "second reset belongs to the joined customer",
    secondReset.email,
    joined.email,
  );
  TestValidator.notEquals(
    "a later password reset should create a distinct reset record",
    firstReset.id,
    secondReset.id,
  );
}
