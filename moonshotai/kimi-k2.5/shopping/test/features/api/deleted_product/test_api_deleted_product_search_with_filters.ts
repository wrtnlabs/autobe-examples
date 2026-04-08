import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function test_api_deleted_product_search_with_filters(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Test basic deleted products search without filters
  const basicRequest = {
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallProduct.IDeletedRequest;
  const basicResult =
    await api.functional.ecommerceMall.admin.deleted_products.index(
      adminConnection,
      { body: basicRequest },
    );
  typia.assert(basicResult);
  TestValidator.predicate(
    "basic search has pagination",
    basicResult.pagination != null,
  );
  // 3. Test filtering by product name (partial match)
  const nameFilterRequest = {
    name: RandomGenerator.alphabets(5),
    page: 1,
    limit: 20,
  } satisfies IEcommerceMallProduct.IDeletedRequest;
  const nameFilterResult =
    await api.functional.ecommerceMall.admin.deleted_products.index(
      adminConnection,
      { body: nameFilterRequest },
    );
  typia.assert(nameFilterResult);
  TestValidator.predicate(
    "name filter returned valid pagination",
    nameFilterResult.pagination.limit <= 20,
  );
  // 4. Test filtering by seller_id and category_id
  const sellerAndCategoryRequest = {
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    category_id: typia.random<string & tags.Format<"uuid">>(),
    page: 1,
    limit: 15,
  } satisfies IEcommerceMallProduct.IDeletedRequest;
  const sellerCategoryResult =
    await api.functional.ecommerceMall.admin.deleted_products.index(
      adminConnection,
      { body: sellerAndCategoryRequest },
    );
  typia.assert(sellerCategoryResult);
  TestValidator.predicate(
    "seller/category filter returned valid result",
    sellerCategoryResult.pagination != null,
  );
  // 5. Test filtering by deletion date range
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeRequest = {
    deleted_at_from: oneMonthAgo.toISOString(),
    deleted_at_to: now.toISOString(),
    page: 1,
    limit: 25,
  } satisfies IEcommerceMallProduct.IDeletedRequest;
  const dateRangeResult =
    await api.functional.ecommerceMall.admin.deleted_products.index(
      adminConnection,
      { body: dateRangeRequest },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returned valid pagination",
    dateRangeResult.pagination.pages >= 0,
  );
  // 6. Test sorting functionality
  const sortRequests = [
    { sort: "deleted_at:DESC", page: 1, limit: 10 },
    { sort: "created_at:ASC", page: 1, limit: 10 },
    { sort: "name:ASC", page: 1, limit: 10 },
  ] as const satisfies IEcommerceMallProduct.IDeletedRequest[];
  for (const req of sortRequests) {
    const sortResult =
      await api.functional.ecommerceMall.admin.deleted_products.index(
        adminConnection,
        { body: req },
      );
    typia.assert(sortResult);
  }
  // 7. Test pagination with different limits
  const paginationLimits = [1, 5, 50, 100] as const;
  for (const limit of paginationLimits) {
    const pageRequest = {
      page: 1,
      limit: limit as number,
    } satisfies IEcommerceMallProduct.IDeletedRequest;
    const pageResult =
      await api.functional.ecommerceMall.admin.deleted_products.index(
        adminConnection,
        { body: pageRequest },
      );
    typia.assert(pageResult);
    TestValidator.equals(
      `pagination limit ${limit} matches request`,
      pageResult.pagination.limit,
      limit,
    );
  }
  // 8. Verify product data structure if any products exist
  if (basicResult.data.length > 0) {
    const firstProduct = basicResult.data[0];
    TestValidator.predicate("product has valid id", firstProduct.id.length > 0);
    TestValidator.predicate(
      "product has valid name",
      typeof firstProduct.name === "string",
    );
    TestValidator.predicate(
      "product has valid basePrice",
      typeof firstProduct.basePrice === "number",
    );
    TestValidator.predicate(
      "product has category",
      firstProduct.category != null,
    );
    TestValidator.predicate("product has seller", firstProduct.seller != null);
    TestValidator.predicate(
      "product has priceRange",
      firstProduct.priceRange != null,
    );
    TestValidator.predicate(
      "product has createdAt",
      firstProduct.createdAt != null,
    );
  }
}
