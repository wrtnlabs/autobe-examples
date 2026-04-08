import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verify administrator-only access for seller account browsing.
 *
 * This test validates the governance boundary on the seller-account moderation
 * list endpoint. It ensures that a non-administrator customer cannot access the
 * seller-account browsing API, while a properly authenticated administrator can
 * access the same endpoint and receive a typed paginated summary response.
 *
 * 1. Authenticate a customer and confirm seller-account browsing is denied.
 * 2. Authenticate an administrator and confirm seller-account browsing succeeds.
 * 3. Validate the administrator response as a paginated seller-account summary
 *    payload without exposing any additional non-schema data.
 */
export async function test_api_seller_account_admin_only_access(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/customer/register",
      referrer: "https://example.com/",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  await TestValidator.httpError(
    "customer cannot browse seller accounts",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.administrator.sellerAccounts.index(
        customerConnection,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies IMallPlatformSellerAccount.IRequest,
        },
      );
    },
  );
  const administratorConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(administrator);
  const page =
    await api.functional.mallPlatform.administrator.sellerAccounts.index(
      administratorConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformSellerAccount.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "pagination metadata is valid",
    page.pagination.current >= 0 &&
      page.pagination.limit >= 0 &&
      page.pagination.records >= 0 &&
      page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "seller-account list data is present as an array",
    Array.isArray(page.data),
  );
}
