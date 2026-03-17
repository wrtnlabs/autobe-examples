import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_variant_option_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate valid UUIDs for the hierarchical path
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const variantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const optionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Retrieve the product variant option
  const output =
    await api.functional.ecommerceMall.products.variants.options.at(
      connection,
      {
        productId,
        variantId,
        optionId,
      },
    );
  typia.assert(output);
  // Validate core business logic: option is linked to product_variant
  TestValidator.equals("option id matches request", output.id, optionId);
  // Validate product_variant reference structure
  TestValidator.equals(
    "product_variant references correct variant",
    output.product_variant.id,
    variantId,
  );
  TestValidator.predicate(
    "product has valid reference",
    output.product_variant.product !== undefined,
  );
  // Validate timestamps are present
  TestValidator.predicate(
    "created_at timestamp exists",
    output.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    output.updated_at !== undefined,
  );
  // Validate soft-deletion field is null (active option)
  TestValidator.equals("option not soft-deleted", output.deleted_at, null);
}
