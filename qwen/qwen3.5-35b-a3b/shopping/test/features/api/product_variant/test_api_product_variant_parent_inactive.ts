import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_variant_parent_inactive(
  connection: api.IConnection,
): Promise<void> {
  // Generate test product and variant IDs
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // Call the API to retrieve the variant
  const variant = await api.functional.ecommerceMall.products.variants.at(
    connection,
    {
      productId,
      variantId,
    },
  );
  // Validate response structure and type
  typia.assert(variant);
  // Validate parent product context shows isActive = false
  typia.assert(variant.product);
  TestValidator.equals(
    "parent product isActive is false",
    variant.product.isActive,
    false,
  );
  // Validate variant details are complete
  TestValidator.predicate(
    "variant has valid stock quantity",
    variant.stock_quantity >= 0,
  );
  TestValidator.equals("variant is active", variant.is_active, true);
  // Validate parent product summary contains all required fields
  TestValidator.predicate("product has name", variant.product.name.length > 0);
  TestValidator.predicate(
    "product has base price",
    variant.product.basePrice >= 0,
  );
  typia.assert(variant.product.category);
  typia.assert(variant.product.seller);
  TestValidator.equals(
    "parent product isActive is false",
    variant.product.isActive,
    false,
  );
  // Validate price_override is properly handled (optional field)
  if (variant.price_override !== undefined) {
    TestValidator.predicate(
      "price_override is a number",
      typeof variant.price_override === "number",
    );
  }
  // Validate timestamps are proper date-time format (covered by typia.assert)
  const _created = variant.created_at;
  const _updated = variant.updated_at;
  const _deleted = variant.deleted_at;
  typia.assert(_created);
  typia.assert(_updated);
  typia.assert(_deleted);
}
