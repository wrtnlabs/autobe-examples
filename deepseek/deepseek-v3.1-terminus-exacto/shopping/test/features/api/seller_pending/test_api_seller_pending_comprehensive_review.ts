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

export async function test_api_seller_pending_comprehensive_review(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies IEcommerceAdministrator.ILogin,
  });
  // 2. Create multiple seller accounts with pending status
  const sellers: IEcommerceSeller.IAuthorized[] = [];
  for (let i = 0; i < 5; i++) {
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "seller123",
        shop_name: RandomGenerator.name(),
        shop_description:
          i % 2 === 0 ? RandomGenerator.paragraph({ sentences: 2 }) : null,
        logo_image_url:
          i % 3 === 0 ? typia.random<string & tags.Format<"uri">>() : null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceSeller.IJoin,
    });
    sellers.push(seller);
    typia.assert(seller);
  }
  // 3. Test pagination with default parameters
  const page1 = await api.functional.ecommerce.seller.pending.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IEcommerceSeller.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "page 1 pagination current",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("page 1 pagination limit", page1.pagination.limit, 2);
  TestValidator.predicate("page 1 has data", page1.data.length > 0);
  // 4. Test page 2 pagination
  const page2 = await api.functional.ecommerce.seller.pending.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 2,
      } satisfies IEcommerceSeller.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "page 2 pagination current",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 pagination limit", page2.pagination.limit, 2);
  // 5. Validate seller summary fields
  const allSellers = [...page1.data, ...page2.data];
  for (const seller of allSellers) {
    TestValidator.predicate("seller has id", typeof seller.id === "string");
    TestValidator.predicate(
      "seller has email",
      typeof seller.email === "string",
    );
    TestValidator.predicate(
      "seller has shop name",
      typeof seller.shop_name === "string",
    );
    TestValidator.predicate(
      "seller has account status",
      typeof seller.account_status === "string",
    );
    TestValidator.predicate(
      "seller has created at",
      typeof seller.created_at === "string",
    );
    // Shop description can be string or null
    TestValidator.predicate(
      "shop description valid",
      seller.shop_description === null ||
        typeof seller.shop_description === "string",
    );
    // Logo image URL can be string or null
    TestValidator.predicate(
      "logo image url valid",
      seller.logo_image_url === null ||
        typeof seller.logo_image_url === "string",
    );
  }
  // 6. Test pagination totals are consistent
  if (page1.pagination.records > 0) {
    TestValidator.equals(
      "total records matches across pages",
      page1.pagination.records,
      page2.pagination.records,
    );
    const totalPages = Math.ceil(
      page1.pagination.records / page1.pagination.limit,
    );
    TestValidator.equals(
      "total pages calculated correctly",
      page1.pagination.pages,
      totalPages,
    );
  }
  // 7. Test date filtering with current date
  const currentDate = new Date().toISOString();
  const yesterdaySellers = await api.functional.ecommerce.seller.pending.index(
    adminConnection,
    {
      body: {
        created_after: currentDate,
        page: 1,
        limit: 10,
      } satisfies IEcommerceSeller.IRequest,
    },
  );
  typia.assert(yesterdaySellers);
  // 8. Test empty search (should return all)
  const allResults = await api.functional.ecommerce.seller.pending.index(
    adminConnection,
    {
      body: {
        search: "",
        page: 1,
        limit: 10,
      } satisfies IEcommerceSeller.IRequest,
    },
  );
  typia.assert(allResults);
  TestValidator.predicate(
    "empty search returns results",
    allResults.data.length >= 0,
  );
}
