import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_product_listing_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin for seller approval
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register seller (starts as pending) - store password for login
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Admin approves seller
  await api.functional.ecommerceMall.admin.admin.sellers.approve(
    adminConnection,
    {
      sellerId: sellerAuth.id,
    },
  );
  // 4. Login as approved seller using stored password
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(approvedSellerConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 5. Test 1: Empty body - default pagination
  const emptyResult =
    await api.functional.ecommerceMall.seller.sellers.me.products.index(
      approvedSellerConnection,
      { body: {} satisfies IEcommerceMallProduct.IRequest },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "default pagination current",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit",
    emptyResult.pagination.limit,
    20,
  );
  TestValidator.equals("data is array", Array.isArray(emptyResult.data), true);
  // 6. Test 2: Query filter - partial name match
  const queryResult =
    await api.functional.ecommerceMall.seller.sellers.me.products.index(
      approvedSellerConnection,
      {
        body: {
          query: "test",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(queryResult);
  for (const product of queryResult.data) {
    TestValidator.predicate(
      "product name contains query term (case-insensitive)",
      product.name.toLowerCase().includes("test"),
    );
  }
  // 7. Test 3: Status='active' filter
  const activeResult =
    await api.functional.ecommerceMall.seller.sellers.me.products.index(
      approvedSellerConnection,
      {
        body: {
          status: "active",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(activeResult);
  // 8. Test 4: Status='deleted' filter
  const deletedResult =
    await api.functional.ecommerceMall.seller.sellers.me.products.index(
      approvedSellerConnection,
      {
        body: {
          status: "deleted",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(deletedResult);
  // 9. Test 5: in_stock=true filter
  const inStockResult =
    await api.functional.ecommerceMall.seller.sellers.me.products.index(
      approvedSellerConnection,
      {
        body: {
          inStock: true,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(inStockResult);
  for (const product of inStockResult.data) {
    TestValidator.equals("hasStock is true", product.hasStock, true);
  }
  // 10. Test 6: SortBy='name' with sortOrder='asc'
  const nameAscResult =
    await api.functional.ecommerceMall.seller.sellers.me.products.index(
      approvedSellerConnection,
      {
        body: {
          sortBy: "name",
          sortOrder: "asc",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(nameAscResult);
  if (nameAscResult.data.length > 1) {
    for (let i = 1; i < nameAscResult.data.length; i++) {
      TestValidator.predicate(
        "products sorted alphabetically by name ascending",
        nameAscResult.data[i - 1].name.localeCompare(
          nameAscResult.data[i].name,
        ) <= 0,
      );
    }
  }
  // 11. Test 7: SortBy='base_price' with sortOrder='desc'
  const priceDescResult =
    await api.functional.ecommerceMall.seller.sellers.me.products.index(
      approvedSellerConnection,
      {
        body: {
          sortBy: "base_price",
          sortOrder: "desc",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(priceDescResult);
  if (priceDescResult.data.length > 1) {
    for (let i = 1; i < priceDescResult.data.length; i++) {
      TestValidator.predicate(
        "products sorted by price descending",
        priceDescResult.data[i - 1].basePrice >=
          priceDescResult.data[i].basePrice,
      );
    }
  }
  // 12. Test 8: Pagination with page=2, limit=5
  const paginatedResult =
    await api.functional.ecommerceMall.seller.sellers.me.products.index(
      approvedSellerConnection,
      {
        body: {
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals("page 2 current", paginatedResult.pagination.current, 2);
  TestValidator.equals("limit 5", paginatedResult.pagination.limit, 5);
  TestValidator.predicate(
    "records count is non-negative",
    paginatedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    paginatedResult.pagination.pages >= 0,
  );
}
