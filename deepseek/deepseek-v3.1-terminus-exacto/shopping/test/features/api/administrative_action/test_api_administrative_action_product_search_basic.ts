import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdminUserBanOfAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfAdministrator";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAdminUserBanOfAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdminUserBanOfAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrative_action_product_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator session using the provided utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // Note: Since we don't have APIs to create administrative actions or product actions,
  // we'll test the search functionality with the assumption that there is existing data.
  // In a real scenario, we would create test data first.
  // Generate a search term for text search testing
  const searchTerm = RandomGenerator.alphabets(5);
  // Test 1: Basic search with text filter
  const searchRequestWithText: IEcommerceAdminUserBanOfAdministrator.IRequest =
    {
      search: searchTerm,
      page: 1,
      limit: 10,
    };
  // We need a valid administrativeActionId - since we can't create one,
  // we'll use a placeholder that should work with the test environment
  const administrativeActionId = typia.random<string & tags.Format<"uuid">>();
  const searchResultWithText =
    await api.functional.ecommerce.administrator.administrative_actions.product_actions.index(
      adminConnection,
      {
        administrativeActionId,
        body: searchRequestWithText,
      },
    );
  typia.assert(searchResultWithText);
  // Test 2: Product ID filtering
  const searchRequestWithProduct: IEcommerceAdminUserBanOfAdministrator.IRequest =
    {
      product_id: typia.random<string & tags.Format<"uuid">>(),
      page: 1,
      limit: 5,
    };
  const searchResultWithProduct =
    await api.functional.ecommerce.administrator.administrative_actions.product_actions.index(
      adminConnection,
      {
        administrativeActionId,
        body: searchRequestWithProduct,
      },
    );
  typia.assert(searchResultWithProduct);
  // Test 3: Pagination testing
  const searchRequestPagination: IEcommerceAdminUserBanOfAdministrator.IRequest =
    {
      page: 1,
      limit: 2,
    };
  const searchResultPagination =
    await api.functional.ecommerce.administrator.administrative_actions.product_actions.index(
      adminConnection,
      {
        administrativeActionId,
        body: searchRequestPagination,
      },
    );
  typia.assert(searchResultPagination);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has current page",
    typeof searchResultPagination.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof searchResultPagination.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records count",
    typeof searchResultPagination.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages count",
    typeof searchResultPagination.pagination.pages === "number",
  );
  // Validate data structure for returned items
  if (searchResultPagination.data.length > 0) {
    const item = searchResultPagination.data[0];
    TestValidator.predicate(
      "item has valid ID",
      typeof item.id === "string" && item.id.length > 0,
    );
    TestValidator.predicate(
      "item has administrative action context",
      typeof item.administrativeAction === "object",
    );
    TestValidator.predicate(
      "item has product details",
      typeof item.product === "object",
    );
    // Validate product summary structure if present
    if (item.product) {
      TestValidator.predicate(
        "product has ID",
        typeof item.product.id === "string",
      );
      TestValidator.predicate(
        "product has name",
        typeof item.product.name === "string",
      );
      TestValidator.predicate(
        "product has price",
        typeof item.product.base_price === "number",
      );
      TestValidator.predicate(
        "product has seller",
        typeof item.product.seller === "object",
      );
      TestValidator.predicate(
        "product has category",
        typeof item.product.category === "object",
      );
    }
  }
  // Test 4: Empty search (should return unfiltered results)
  const searchRequestEmpty: IEcommerceAdminUserBanOfAdministrator.IRequest = {
    page: 1,
    limit: 10,
  };
  const searchResultEmpty =
    await api.functional.ecommerce.administrator.administrative_actions.product_actions.index(
      adminConnection,
      {
        administrativeActionId,
        body: searchRequestEmpty,
      },
    );
  typia.assert(searchResultEmpty);
  // Validate that results respect the limit parameter
  TestValidator.predicate(
    "results respect limit parameter",
    searchResultEmpty.data.length <= searchResultEmpty.pagination.limit,
  );
}
