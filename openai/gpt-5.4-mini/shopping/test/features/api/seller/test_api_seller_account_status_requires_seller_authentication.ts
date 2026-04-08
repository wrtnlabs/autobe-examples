import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_account_status_requires_seller_authentication(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that seller account status is only accessible to an authenticated seller.
   *
   * This test covers two access-control paths required by the platform rules:
   * 1. An unauthenticated request must be denied.
   * 2. A customer-authenticated request must also be denied because the endpoint is seller-only.
   *
   * The scenario ensures seller approval state remains private to the seller identity and is not leaked to other principals.
   */
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthenticated seller account status access is denied",
    async () => {
      await api.functional.mallPlatform.seller.account.status.at(
        anonymousConnection,
      );
    },
  );
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  await TestValidator.error(
    "customer-authenticated seller account status access is denied",
    async () => {
      await api.functional.mallPlatform.seller.account.status.at(
        customerConnection,
      );
    },
  );
}
