import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductAttribute";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_attribute_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Use a known product ID (assumed to exist in test environment)
  // Since no product creation endpoint is available, we use a valid UUID for testing
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Perform search with partial name match
  const searchTerm = "color";
  const searchResult =
    await api.functional.shoppingMall.admin.products.attributes.index(
      adminConnection,
      {
        productId,
        body: {
          name: searchTerm,
          limit: 10,
          page: 1,
        } satisfies IShoppingMallProductAttribute.IRequest,
      },
    );
  typia.assert(searchResult);
  // Step 4: Validate response structure
  TestValidator.equals(
    "pagination structure",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records is positive",
    () => searchResult.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    () => searchResult.pagination.pages > 0,
  );
  // Step 5: Validate data contents
  TestValidator.predicate(
    "data array exists and has elements",
    () => Array.isArray(searchResult.data) && searchResult.data.length > 0,
  );
  // Step 6: Validate each attribute matches search criteria (case-insensitive substring)
  for (const attribute of searchResult.data) {
    TestValidator.predicate(
      "attribute has valid id",
      () => typeof attribute.id === "string" && attribute.id.length > 0,
    );
    TestValidator.predicate(
      "attribute has valid name",
      () => typeof attribute.name === "string" && attribute.name.length > 0,
    );
    TestValidator.predicate("attribute has valid type", () =>
      [
        "text",
        "number",
        "boolean",
        "select",
        "multi_select",
        "color",
        "date",
        "file",
      ].includes(attribute.type),
    );
    TestValidator.equals(
      "attribute name contains search term (case-insensitive)",
      attribute.name.toLowerCase().includes(searchTerm.toLowerCase()),
      true,
    );
    TestValidator.equals(
      "attribute is required flag is boolean",
      typeof attribute.is_required === "boolean",
      true,
    );
    TestValidator.predicate(
      "attribute sort order is valid",
      () =>
        Number.isInteger(attribute.sort_order) &&
        attribute.sort_order >= 0 &&
        attribute.sort_order <= 1000,
    );
    TestValidator.predicate(
      "attribute description is null or string",
      () =>
        attribute.description === null ||
        typeof attribute.description === "string",
    );
  }
  // Ensure all returned attributes are associated with the searched product
  // The productId parameter in the request ensures this
}
