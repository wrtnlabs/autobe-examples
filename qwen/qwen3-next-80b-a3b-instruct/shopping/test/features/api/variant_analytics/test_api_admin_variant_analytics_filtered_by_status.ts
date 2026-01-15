import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallVariant";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallLocationZone } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLocationZone";
import type { IShoppingMallProductBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductBrand";
import type { IShoppingMallVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariant";
import type { IShoppingMallVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttribute";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_variant_analytics_filtered_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using the provided authorization function
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: `https://example.com/admin/join-${RandomGenerator.alphaNumeric(6)}`,
      referrer: `https://example.com/admin/signup-${RandomGenerator.alphaNumeric(6)}`,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Call the variants index endpoint (no filtering possible per API definition)
  const response: IPageIShoppingMallVariant.ISummary =
    await api.functional.shoppingMall.admin.dashboard.admins.variants.index(
      adminConnection,
    );
  // Validate the response structure
  typia.assert(response);
  // Verify pagination structure is correct
  TestValidator.equals(
    "pagination structure - current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination structure - limit",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination structure - records should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination structure - pages should be at least 1",
    response.pagination.pages >= 1,
  );
  // Verify data array is present and populated
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  TestValidator.predicate(
    "data array should not be null",
    response.data !== null,
  );
  // Validate that each variant has the correct structure
  for (const variant of response.data) {
    // Verify variant has required properties
    TestValidator.predicate(
      "variant has id",
      typeof variant.id === "string" && variant.id.length > 0,
    );
    TestValidator.predicate(
      "variant has sku",
      typeof variant.sku === "string" && variant.sku.length > 0,
    );
    TestValidator.predicate(
      "variant has name",
      typeof variant.name === "string" && variant.name.length > 0,
    );
    TestValidator.predicate(
      "variant has description",
      typeof variant.description === "string",
    );
    TestValidator.predicate(
      "variant has price",
      typeof variant.price === "number" && variant.price >= 0,
    );
    TestValidator.predicate(
      "variant has base_price",
      typeof variant.base_price === "number" && variant.base_price >= 0,
    );
    TestValidator.predicate(
      "variant has price_delta",
      typeof variant.price_delta === "number",
    );
    TestValidator.predicate(
      "variant has currency",
      typeof variant.currency === "string" && variant.currency.length > 0,
    );
    TestValidator.predicate(
      "variant has inventory_quantity",
      typeof variant.inventory_quantity === "number" &&
        variant.inventory_quantity >= 0,
    );
    TestValidator.predicate(
      "variant has reserved_quantity",
      typeof variant.reserved_quantity === "number" &&
        variant.reserved_quantity >= 0,
    );
    TestValidator.predicate(
      "variant has out_of_stock_threshold",
      typeof variant.out_of_stock_threshold === "number" &&
        variant.out_of_stock_threshold >= 0,
    );
    TestValidator.predicate(
      "variant has availability_status",
      variant.availability_status === "in_stock" ||
        variant.availability_status === "low_stock" ||
        variant.availability_status === "out_of_stock" ||
        variant.availability_status === "pre_order" ||
        variant.availability_status === "discontinued",
    );
    TestValidator.predicate(
      "variant has is_published",
      typeof variant.is_published === "boolean",
    );
    TestValidator.predicate(
      "variant has product_id",
      typeof variant.product_id === "string" && variant.product_id.length > 0,
    );
    TestValidator.predicate(
      "variant has product_name",
      typeof variant.product_name === "string" &&
        variant.product_name.length > 0,
    );
    TestValidator.predicate(
      "variant has product_brand",
      typeof variant.product_brand === "object" &&
        variant.product_brand !== null,
    );
    TestValidator.predicate(
      "variant has product_category",
      typeof variant.product_category === "object" &&
        variant.product_category !== null,
    );
    TestValidator.predicate(
      "variant has variant_attributes",
      Array.isArray(variant.variant_attributes),
    );
    TestValidator.predicate(
      "variant has available_options_count",
      typeof variant.available_options_count === "number" &&
        variant.available_options_count >= 0,
    );
    TestValidator.predicate(
      "variant has reviews_count",
      typeof variant.reviews_count === "number" && variant.reviews_count >= 0,
    );
    TestValidator.predicate(
      "variant has average_rating",
      typeof variant.average_rating === "number" &&
        variant.average_rating >= 0 &&
        variant.average_rating <= 5,
    );
    TestValidator.predicate(
      "variant has sales_count",
      typeof variant.sales_count === "number" && variant.sales_count >= 0,
    );
    TestValidator.predicate(
      "variant has visibility_score",
      typeof variant.visibility_score === "number" &&
        variant.visibility_score >= 0 &&
        variant.visibility_score <= 1,
    );
    TestValidator.predicate(
      "variant has variant_tagged",
      Array.isArray(variant.variant_tagged),
    );
    TestValidator.predicate(
      "variant has location_zones",
      Array.isArray(variant.location_zones),
    );
    TestValidator.predicate(
      "variant has compliance_status",
      variant.compliance_status === "compliant" ||
        variant.compliance_status === "pending_review" ||
        variant.compliance_status === "non_compliant",
    );
    TestValidator.predicate(
      "variant has production_status",
      variant.production_status === "active" ||
        variant.production_status === "discontinued" ||
        variant.production_status === "end_of_life" ||
        variant.production_status === "prototype",
    );
    TestValidator.predicate(
      "variant has seo_title",
      typeof variant.seo_title === "string",
    );
    TestValidator.predicate(
      "variant has seo_description",
      typeof variant.seo_description === "string",
    );
    TestValidator.predicate(
      "variant has variant_type",
      variant.variant_type === "standard" ||
        variant.variant_type === "premium" ||
        variant.variant_type === "economy" ||
        variant.variant_type === "limited" ||
        variant.variant_type === "seasonal",
    );
  }
}
