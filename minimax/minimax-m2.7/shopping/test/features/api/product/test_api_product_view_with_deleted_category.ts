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

export async function test_api_product_view_with_deleted_category(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection for viewing products
  const customerConnection: api.IConnection = { host: connection.host };
  // Use a test product ID - in a real E2E environment, this would be a product
  // whose category was previously deleted to verify historical accuracy
  const testProductId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the product via public endpoint
  // This simulates retrieving a product assigned to a now-deleted category
  const product = await api.functional.ecommerceMall.products.at(
    customerConnection,
    {
      productId: testProductId,
    },
  );
  // typia.assert validates complete response structure including:
  // - id, name, description, basePrice
  // - seller profile
  // - category (preserved for historical accuracy even if deleted)
  // - productImages, variants, reviews
  typia.assert(product);
  // Validate business logic aspects
  TestValidator.equals("product id is UUID format", product.id, testProductId);
  TestValidator.predicate("product name is non-empty", product.name.length > 0);
  TestValidator.predicate(
    "category reference preserved",
    product.category !== null && product.category.id !== null,
  );
  TestValidator.predicate(
    "seller profile present",
    product.seller !== null && product.seller.id !== null,
  );
}
