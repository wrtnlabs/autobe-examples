import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_search_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup administrator with separate connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Setup seller with separate connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "seller123",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Test administrator can search sellers (valid access)
  const searchParams = {
    search: RandomGenerator.name(),
    account_status: "pending_approval",
    created_after: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_before: new Date().toISOString(),
    page: 1 satisfies number as number,
    limit: 10 satisfies number as number,
  } satisfies IEcommerceSeller.IRequest;
  const searchResult = await api.functional.ecommerce.sellers.index(
    adminConnection,
    { body: searchParams },
  );
  typia.assert(searchResult);
  // Validate pagination structure
  TestValidator.equals(
    "pagination has required fields",
    typeof searchResult.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination contains current page",
    typeof searchResult.pagination.current === "number",
  );
  TestValidator.predicate("data is an array", Array.isArray(searchResult.data));
  // 4. Test seller cannot search sellers (access denied)
  await TestValidator.error(
    "seller should not access seller search endpoint",
    async () => {
      await api.functional.ecommerce.sellers.index(sellerConnection, {
        body: {
          search: RandomGenerator.name(),
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IEcommerceSeller.IRequest,
      });
    },
  );
  // 5. Test empty search with specific filters
  const emptySearchParams = {
    search: "nonexistentshopname12345",
    account_status: "approved",
    page: 1 satisfies number as number,
    limit: 5 satisfies number as number,
  } satisfies IEcommerceSeller.IRequest;
  const emptyResult = await api.functional.ecommerce.sellers.index(
    adminConnection,
    { body: emptySearchParams },
  );
  typia.assert(emptyResult);
  TestValidator.predicate(
    "empty search returns valid pagination",
    emptyResult.pagination.records >= 0,
  );
  // 6. Test pagination boundary (out of bounds)
  const largePageParams = {
    page: 9999 satisfies number as number,
    limit: 10 satisfies number as number,
  } satisfies IEcommerceSeller.IRequest;
  const largePageResult = await api.functional.ecommerce.sellers.index(
    adminConnection,
    { body: largePageParams },
  );
  typia.assert(largePageResult);
  TestValidator.predicate(
    "large page returns empty data array",
    largePageResult.data.length === 0,
  );
}
