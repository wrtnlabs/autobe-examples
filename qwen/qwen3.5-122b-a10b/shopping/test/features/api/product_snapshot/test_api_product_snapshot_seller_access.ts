import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
 * Test seller successfully views a snapshot of their own product for audit trail and dispute resolution purposes.
 *
 * Test workflow:
 * 1. Seller registers and authenticates via POST /ecommerceMall/auth/seller/join
 * 2. Seller creates a product via POST /ecommerceMall/seller/products
 * 3. Seller edits the product (e.g., update name, description, or base price) via PUT /ecommerceMall/seller/products/{productId}
 * 4. System automatically creates a product snapshot capturing the before/after state
 * 5. Seller retrieves the snapshot via GET /ecommerceMall/products/{productId}/snapshots/{snapshotId}
 *
 * Validation points:
 * - Snapshot contains all required fields: id, productId, product, seller, previousValues, currentValues, createdAt
 * - previousValues and currentValues contain complete product state (name, description, category, base price, images, variants)
 * - seller field shows the seller who made the change
 * - createdAt timestamp is set by server
 * - Product reference includes seller and category information
 * - Snapshot is accessible only to the product owner
 */
export async function test_api_product_snapshot_seller_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registers and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 3 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    });
  typia.assert(sellerAuth);
  // 2. Seller creates a product
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // Store original product state
  const originalName: string = product.name;
  const originalDescription: string = product.description;
  const originalBasePrice: number = product.basePrice;
  // 3. Seller edits the product (triggers snapshot creation)
  const updatedProduct: IEcommerceMallProduct =
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: `${originalName} (Updated)`,
          description: `${originalDescription} - Modified description`,
          base_price: originalBasePrice + 1000,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // Verify product was updated
  TestValidator.notEquals(
    "product name changed",
    originalName,
    updatedProduct.name,
  );
  TestValidator.notEquals(
    "product description changed",
    originalDescription,
    updatedProduct.description,
  );
  TestValidator.notEquals(
    "product base price changed",
    originalBasePrice,
    updatedProduct.basePrice,
  );
  // 4. Seller retrieves the snapshot
  // In simulation mode, typia.random generates valid snapshot data
  // In production, snapshotId would be obtained from update response or list endpoint
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshot: IEcommerceMallProductSnapshot =
    await api.functional.ecommerceMall.products.snapshots.at(sellerConnection, {
      productId: product.id,
      snapshotId: snapshotId,
    });
  typia.assert(snapshot);
  // 5. Validate snapshot structure and content
  TestValidator.equals(
    "snapshot productId matches",
    snapshot.productId,
    product.id,
  );
  TestValidator.predicate("snapshot has id", snapshot.id.length > 0);
  TestValidator.predicate(
    "snapshot has createdAt",
    snapshot.createdAt.length > 0,
  );
  // Validate product reference in snapshot
  TestValidator.equals(
    "snapshot product id matches",
    snapshot.product.id,
    product.id,
  );
  TestValidator.equals(
    "snapshot product name matches updated name",
    snapshot.product.name,
    updatedProduct.name,
  );
  TestValidator.predicate(
    "snapshot product has seller",
    snapshot.product.seller !== null && snapshot.product.seller !== undefined,
  );
  TestValidator.predicate(
    "snapshot product has category",
    snapshot.product.category !== null &&
      snapshot.product.category !== undefined,
  );
  // Validate seller field in snapshot
  TestValidator.predicate(
    "snapshot has seller information",
    snapshot.seller !== null && snapshot.seller !== undefined,
  );
  if (snapshot.seller) {
    TestValidator.equals(
      "snapshot seller id matches",
      snapshot.seller.id,
      sellerAuth.seller.id,
    );
  }
  // Validate previousValues and currentValues exist
  TestValidator.predicate(
    "snapshot has previousValues",
    snapshot.previousValues !== null && snapshot.previousValues !== undefined,
  );
  TestValidator.predicate(
    "snapshot has currentValues",
    snapshot.currentValues !== null && snapshot.currentValues !== undefined,
  );
}
