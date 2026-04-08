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
 * Verifies authenticated customer password reset creation for an eligible account.
 *
 * This test validates the complete customer recovery initiation flow by first creating and authenticating
 * a customer account, then requesting a password reset for that same account. It confirms that the API
 * returns the public password reset record for the targeted customer and that the response remains limited
 * to the exposed DTO fields.
 *
 * 1. Create an isolated customer connection and register a new customer account.
 * 2. Use the authenticated customer connection to request a password reset.
 * 3. Validate the returned record matches the authenticated account email and exposes the public reset metadata.
 */
export async function test_api_customer_password_reset_creation(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const reset =
    await generate_random_mall_platform_customer_password_resets_create(
      customerConnection,
      {
        body: {
          mall_platform_customer_id: authorized.id,
        } satisfies IMallPlatformCustomerPasswordReset.ICreate,
      },
    );
  typia.assert(reset);
  TestValidator.equals(
    "password reset email should match customer email",
    reset.email,
    authorized.email,
  );
  TestValidator.predicate(
    "password reset id should be a non-empty value",
    reset.id.length > 0,
  );
  TestValidator.predicate(
    "password reset timestamp should be a non-empty value",
    reset.updatedAt.length > 0,
  );
}
