import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantAttribute";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantAttribute";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_variant_attributes_search_by_category_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate using utility function (mandatory priority)
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href:
          "https://example.com/admin/join-" + RandomGenerator.alphaNumeric(6),
        referrer:
          "https://example.com/admin/signup-" + RandomGenerator.alphaNumeric(6),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate a category_id
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Create date range values
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const createdAtFrom: string & tags.Format<"date-time"> =
    threeDaysAgo.toISOString();
  const createdAtTo: string & tags.Format<"date-time"> =
    oneDayAgo.toISOString();
  // Step 4: Create the request object with all required filters
  const request: IShoppingMallProductVariantAttribute.IRequest = {
    category_id: categoryId,
    created_at_from: createdAtFrom,
    created_at_to: createdAtTo,
    sort_by: "usage_count",
    sort_order: "desc",
    page: 2,
    limit: 50,
    is_active: true,
  } satisfies IShoppingMallProductVariantAttribute.IRequest;
  // Step 5: Call the API function with admin connection
  const result: IPageIShoppingMallProductVariantAttribute.ISummary =
    await api.functional.shoppingMall.product_variants.attributes.index(
      adminConnection,
      { body: request },
    );
  typia.assert(result);
  // Step 6: Validate pagination
  TestValidator.equals("page should be 2", result.pagination.current, 2);
  TestValidator.equals("limit should be 50", result.pagination.limit, 50);
  // Step 7: Validate data and filtering
  TestValidator.predicate(
    "data array should not be empty",
    result.data.length > 0,
  );
  // Validate that all attributes are active
  TestValidator.predicate(
    "all attributes should be active",
    result.data.every((attr) => attr.status === "active"),
  );
  // Validate all attributes have the correct category
  TestValidator.predicate(
    "all attributes should have the correct category",
    result.data.every((attr) => attr.category_id === categoryId),
  );
  // Validate other available properties
  TestValidator.predicate(
    "all attributes have a valid name",
    result.data.every((attr) => attr.name.length > 0),
  );
  TestValidator.predicate(
    "all attributes have a valid type",
    result.data.every((attr) =>
      [
        "select",
        "text",
        "checkbox",
        "radio",
        "number",
        "date",
        "color",
        "image",
      ].includes(attr.type),
    ),
  );
  TestValidator.predicate(
    "all attributes have a valid status",
    result.data.every((attr) =>
      ["active", "inactive", "deprecated"].includes(attr.status),
    ),
  );
}
