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

export async function test_api_customer_password_reset_ineligible_account_rejected(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that password reset initiation for an ineligible customer account is rejected.
   *
   * This scenario validates the recovery gate for customer password resets. It confirms that a legitimate customer session can submit the request, but the backend refuses to create a reset record when the target customer account is not eligible for recovery.
   *
   * 1. Register a valid customer and create an isolated authenticated customer connection.
   * 2. Attempt to initiate a password reset for an ineligible target customer account identifier.
   * 3. Assert the operation is rejected and no password reset record is returned.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(joined);
  const ineligibleCustomerId = typia.random<string & tags.Format<"uuid">>();
  TestValidator.notEquals(
    "ineligible target customer id should differ from joined customer id",
    ineligibleCustomerId,
    joined.id,
  );
  await TestValidator.error(
    "password reset initiation should reject ineligible customer accounts",
    async () => {
      await api.functional.mallPlatform.customer.password_resets.create(
        customerConnection,
        {
          body: {
            mall_platform_customer_id: ineligibleCustomerId,
          } satisfies IMallPlatformCustomerPasswordReset.ICreate,
        },
      );
    },
  );
}
