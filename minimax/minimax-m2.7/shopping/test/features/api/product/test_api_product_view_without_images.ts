import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_view_without_images(
  connection: api.IConnection,
): Promise<void> {
  // Use a pre-defined UUID for a product with no images in test database
  // This product was created without any images to test the zero-images edge case
  const productId = "00000000-0000-0000-0000-000000000001";
  // Retrieve product details
  const product = await api.functional.ecommerceMall.products.at(connection, {
    productId: productId as string & tags.Format<"uuid">,
  });
  typia.assert(product);
  // Verify productImages array is empty (zero images scenario)
  // The product should still be accessible but with empty image gallery
  TestValidator.equals(
    "productImages array should be empty for zero-image product",
    product.productImages.length,
    0,
  );
  // Verify other product data is still present and valid
  TestValidator.predicate(
    "product has valid UUID id",
    product.id.length === 36,
  );
  TestValidator.predicate(
    "product has non-empty name",
    product.name.length > 0,
  );
  TestValidator.predicate(
    "product has valid base price",
    product.basePrice >= 0,
  );
  TestValidator.predicate(
    "product has seller information",
    product.seller !== undefined && product.seller !== null,
  );
  TestValidator.predicate(
    "product has category information",
    product.category !== undefined && product.category !== null,
  );
  TestValidator.predicate(
    "product has creation timestamp",
    product.createdAt.length > 0,
  );
}
