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
export async function test_api_product_variant_attributes_search_active(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
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
  // Step 2: Search for active product variant attributes with explicit defaults
  // According to schema: default page is 1, limit is 20, sort_by is 'name', sort_order is 'asc'
  const result: IPageIShoppingMallProductVariantAttribute.ISummary =
    await api.functional.shoppingMall.product_variants.attributes.index(
      adminConnection,
      {
        body: {
          is_active: true,
          page: 1,
          limit: 20,
          sort_by: "name",
          sort_order: "asc",
        } satisfies IShoppingMallProductVariantAttribute.IRequest,
      },
    );
  typia.assert(result);
  // Step 3: Validate response structure
  // Check pagination
  TestValidator.equals("page number is 1", result.pagination.current, 1);
  TestValidator.equals("page size is 20", result.pagination.limit, 20);
  TestValidator.predicate("total records >= 0", result.pagination.records >= 0);
  TestValidator.predicate("total pages >= 0", result.pagination.pages >= 0);
  // Validate data array contains only active attributes
  for (const attribute of result.data) {
    TestValidator.equals(
      "attribute status is active",
      attribute.status,
      "active",
    );
    TestValidator.predicate(
      "attribute name has value",
      attribute.name.length > 0,
    );
    TestValidator.equals(
      "attribute type is one of valid types",
      [
        "select",
        "text",
        "checkbox",
        "radio",
        "number",
        "date",
        "color",
        "image",
      ].includes(attribute.type),
      true,
    );
  }
  // Step 4: Validate attributes are sorted by name in ascending order
  const sortedByNames = result.data.map((attr) => attr.name);
  const sortedClone = [...sortedByNames].sort();
  TestValidator.equals(
    "attributes sorted by name ascending",
    sortedByNames,
    sortedClone,
  );
}
