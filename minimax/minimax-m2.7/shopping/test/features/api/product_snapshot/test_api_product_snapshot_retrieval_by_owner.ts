import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test retrieving a product snapshot as the owning seller.
 *
 * This validates the primary success path where an approved seller retrieves
 * a historical product state they previously created. When a seller creates
 * a product, an initial snapshot is automatically created. This test verifies
 * that the seller can successfully retrieve that snapshot with all expected
 * historical data preserved.
 *
 * Steps:
 * 1. Register a new seller account with valid credentials
 * 2. Create a new product with name, description, category, and base price
 * 3. Retrieve the product snapshot using the product ID and snapshot ID
 * 4. Validate snapshot contains correct historical product data
 * 5. Verify name, description, and base_price match creation input
 */
export async function test_api_product_snapshot_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Create authenticated connection with seller token
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${sellerAuth.token.access}`,
    },
  };
  // 2. Create a new product (automatically creates initial snapshot)
  const productName = RandomGenerator.paragraph({ sentences: 2 });
  const productDescription = RandomGenerator.content({ paragraphs: 3 });
  const basePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
  >();
  const product = await generate_random_ecommerce_mall_seller_products_create(
    authenticatedSellerConnection,
    {
      body: {
        name: productName,
        description: productDescription,
        base_price: basePrice,
      },
    },
  );
  typia.assert(product);
  // 3. Retrieve the product snapshot
  // The product creation automatically creates the first snapshot
  // We need to get the snapshot ID - for this test, we'll use the product's
  // initial snapshot which is created at product creation time
  const snapshot =
    await api.functional.ecommerceMall.seller.products.snapshots.at(
      authenticatedSellerConnection,
      {
        productId: product.id,
        snapshotId: product.id, // Using product ID as snapshot ID for the initial snapshot
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot response structure
  TestValidator.equals("snapshot has id", snapshot.id !== null, true);
  TestValidator.equals("snapshot has name", snapshot.name !== null, true);
  TestValidator.equals(
    "snapshot has description",
    snapshot.description !== null,
    true,
  );
  TestValidator.equals(
    "snapshot has base_price",
    snapshot.base_price !== null,
    true,
  );
  TestValidator.equals(
    "snapshot has category_name",
    snapshot.category_name !== null,
    true,
  );
  TestValidator.equals(
    "snapshot has created_at",
    snapshot.created_at !== null,
    true,
  );
  TestValidator.equals(
    "snapshot has product summary",
    snapshot.product !== null,
    true,
  );
  TestValidator.equals(
    "snapshot has seller summary",
    snapshot.seller !== null,
    true,
  );
  // 5. Verify snapshot data matches product creation input
  TestValidator.equals(
    "snapshot name matches product name",
    snapshot.name,
    product.name,
  );
  TestValidator.equals(
    "snapshot description matches product description",
    snapshot.description,
    product.description,
  );
  TestValidator.equals(
    "snapshot base_price matches creation price",
    snapshot.base_price,
    basePrice,
  );
  TestValidator.equals(
    "snapshot product id matches product id",
    snapshot.product.id,
    product.id,
  );
  // Verify product summary has correct data
  TestValidator.equals(
    "product summary name matches",
    snapshot.product.name,
    product.name,
  );
  // Verify seller summary has correct data
  TestValidator.equals(
    "seller summary id matches seller id",
    snapshot.seller.id,
    sellerAuth.id,
  );
}
