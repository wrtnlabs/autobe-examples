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
export async function test_api_admin_variant_analytics_sorted_by_sales_count(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Call the variant analytics endpoint with admin connection
  const response: IPageIShoppingMallVariant.ISummary =
    await api.functional.shoppingMall.admin.dashboard.admins.variants.index(
      adminConnection,
    );
  typia.assert(response);
  // Validate pagination structure
  TestValidator.equals(
    "pagination total records",
    response.pagination.records,
    response.data.length,
  );
  TestValidator.predicate(
    "pagination current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    response.pagination.pages >= 1,
  );
  // Validate that data array is not empty
  TestValidator.predicate("variant data exists", response.data.length > 0);
  // Validate that variants are sorted by sales_count in descending order
  for (let i = 0; i < response.data.length - 1; i++) {
    const current = response.data[i];
    const next = response.data[i + 1];
    TestValidator.predicate(
      "variants sorted by sales_count descending",
      current.sales_count >= next.sales_count,
    );
  }
  // Validate individual variant structure
  for (const variant of response.data) {
    TestValidator.equals(
      "variant has valid uuid id",
      typeof variant.id,
      "string",
    );
    TestValidator.predicate(
      "variant id is uuid format",
      /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
        variant.id,
      ),
    );
    TestValidator.equals("variant has name", typeof variant.name, "string");
    TestValidator.equals("variant has sku", typeof variant.sku, "string");
    TestValidator.predicate(
      "variant has non-negative price",
      variant.price >= 0,
    );
    TestValidator.predicate(
      "variant has non-negative base_price",
      variant.base_price >= 0,
    );
    TestValidator.predicate(
      "variant has non-negative inventory",
      variant.inventory_quantity >= 0,
    );
    TestValidator.predicate(
      "variant has non-negative reserved quantity",
      variant.reserved_quantity >= 0,
    );
    TestValidator.predicate(
      "variant has non-negative out of stock threshold",
      variant.out_of_stock_threshold >= 0,
    );
    TestValidator.predicate(
      "variant has valid availability status",
      ["in_stock", "low_stock", "out_of_stock", "pre_order", "discontinued"].includes(variant.availability_status),
    );
    TestValidator.equals(
      "variant has boolean is_published",
      typeof variant.is_published,
      "boolean",
    );
    TestValidator.equals(
      "variant has valid product_id",
      typeof variant.product_id,
      "string",
    );
    TestValidator.equals(
      "variant has product name",
      typeof variant.product_name,
      "string",
    );
    TestValidator.equals(
      "variant has product brand summary",
      typeof variant.product_brand,
      "object",
    );
    TestValidator.equals(
      "variant has product category summary",
      typeof variant.product_category,
      "object",
    );
    TestValidator.equals(
      "variant has variant attributes array",
      typeof variant.variant_attributes,
      "object",
    );
    TestValidator.predicate(
      "variant has non-negative available options count",
      variant.available_options_count >= 0,
    );
    TestValidator.predicate(
      "variant has non-negative reviews count",
      variant.reviews_count >= 0,
    );
    TestValidator.predicate(
      "variant has valid average rating",
      variant.average_rating >= 0 && variant.average_rating <= 5,
    );
    TestValidator.predicate(
      "variant has non-negative sales count",
      variant.sales_count >= 0,
    );
    TestValidator.predicate(
      "variant has valid visibility score",
      variant.visibility_score >= 0 && variant.visibility_score <= 1,
    );
    TestValidator.equals(
      "variant has variant tagged array",
      typeof variant.variant_tagged,
      "object",
    );
    TestValidator.equals(
      "variant has location zones array",
      typeof variant.location_zones,
      "object",
    );
    TestValidator.predicate(
      "variant has valid compliance status",
      ["compliant", "pending_review", "non_compliant"].includes(variant.compliance_status),
    );
    TestValidator.predicate(
      "variant has valid production status",
      ["active", "discontinued", "end_of_life", "prototype"].includes(variant.production_status),
    );
    TestValidator.equals(
      "variant has seo title",
      typeof variant.seo_title,
      "string",
    );
    TestValidator.equals(
      "variant has seo description",
      typeof variant.seo_description,
      "string",
    );
    TestValidator.predicate(
      "variant has valid variant type",
      ["standard", "premium", "economy", "limited", "seasonal"].includes(variant.variant_type),
    );
  }
}