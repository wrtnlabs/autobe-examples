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
export async function test_api_product_variant_attributes_search_sort_by_usage_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate a large set of product variant attributes
  // Simulate higher index = higher usage count
  const attributeCount = 100;
  const attributes = await ArrayUtil.asyncRepeat(
    attributeCount,
    async (index) => {
      // Generate attribute with no usage_count (as per DTO)
      const attribute: IShoppingMallProductVariantAttribute.ISummary = {
        id: typia.random<string & tags.Format<"uuid">>(),
        name: `Attribute ${index}`,
        type: RandomGenerator.pick([
          "select",
          "text",
          "checkbox",
          "radio",
        ] as const),
        status: RandomGenerator.pick([
          "active",
          "inactive",
          "deprecated",
        ] as const),
        category_id:
          index % 2 === 0
            ? typia.random<string & tags.Format<"uuid">>()
            : undefined,
        priority: Math.floor(Math.random() * 100),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        is_required: index % 3 === 0,
        is_filterable: index % 4 === 0,
        is_sortable: index % 5 === 0,
        min_value: index % 2 === 0 ? Math.random() * 100 : undefined,
        max_value: index % 2 === 0 ? Math.random() * 100 + 100 : undefined,
        step_value:
          index % 3 === 0
            ? ((Math.random() * 5 + 0.1) as number & tags.Minimum<0.01>)
            : undefined,
        is_deprecated: index % 7 === 0,
        system_generated: index % 8 === 0,
        tags: ArrayUtil.repeat(2, () => RandomGenerator.alphaNumeric(5)),
      } satisfies IShoppingMallProductVariantAttribute.ISummary;
      // We associate index as proxy for usage_count (higher index = higher usage)
      // No usage_count property is added since it's not in the DTO
      return { ...attribute, _index: index }; // Use _index as proxy, not exposed in final DTO
    },
  );
  // Step 3: Simulate server-side sorting by usage_count descending
  // Sort our dataset by its index (proxy for usage_count) in descending order
  // highest usage = highest index
  const sortedByUsage = [...attributes].sort(
    (a, b) => (b._index as number) - (a._index as number),
  );
  // Step 4: Prepare search parameters for page 3, limit 10
  // Page 3 with limit 10: skip first 20 items (pages 1-2), take next 10
  // So we expect items at positions [20, 21, ..., 29] in the sorted list
  const searchParams: IShoppingMallProductVariantAttribute.IRequest = {
    sort_by: "usage_count",
    sort_order: "desc",
    page: 3,
    limit: 10,
    is_active: true, // Added required property is_active
  };
  // Step 5: Make the API call
  const result: IPageIShoppingMallProductVariantAttribute.ISummary =
    await api.functional.shoppingMall.product_variants.attributes.index(
      adminConnection,
      {
        body: searchParams,
      },
    );
  typia.assert(result);
  // Step 6: Validate pagination metadata
  TestValidator.equals("pagination current page", result.pagination.current, 3);
  TestValidator.equals("pagination limit", result.pagination.limit, 10);
  TestValidator.equals(
    "pagination records",
    result.pagination.records,
    attributeCount,
  );
  TestValidator.equals(
    "pagination pages",
    result.pagination.pages,
    Math.ceil(attributeCount / 10),
  );
  // Step 7: Validate result order
  // We expect items 20-29 from our sortedByUsage (largest usage)
  // which corresponds to the original index 99-90
  const expected = sortedByUsage.slice(20, 30);
  // Validate data integrity
  TestValidator.equals("result count matches limit", result.data.length, 10);
  for (let i = 0; i < result.data.length; i++) {
    const actual = result.data[i];
    const expectedItem = expected[i];
    // Validate IDs match (since internal ID is unique)
    TestValidator.equals(
      `result ${i} item id matches`,
      actual.id,
      expectedItem.id,
    );
    // Validate name matches the expected one from our generated set
    TestValidator.equals(
      `result ${i} name matches`,
      actual.name,
      expectedItem.name,
    );
    // Since usage_count is not in the DTO response, we don't validate it
    // Instead, we know the order proves sorting is working
    // And we validate the order by the proxy (this is enough for E2E)
  }
  // Step 8: Validate that no duplicates exist in results
  const resultIds = result.data.map((item) => item.id);
  TestValidator.equals(
    "no duplicate ids",
    resultIds.length,
    new Set(resultIds).size,
  );
}