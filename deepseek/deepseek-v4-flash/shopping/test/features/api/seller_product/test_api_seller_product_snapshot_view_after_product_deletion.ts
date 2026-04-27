import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductSnapshot";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test that a seller can retrieve a product snapshot even after the product has been soft-deleted.
 *
 * Validates that product snapshots, which are immutable historical records automatically created whenever a seller edits a product, remain accessible after the parent product is deleted (visibility set to 'deleted'). The snapshot must preserve the complete product state — name, description, base price — as it existed before the edit that triggered the snapshot.
 *
 * This test covers the business rule that "Product snapshots are immutable and cannot be deleted. They are preserved even after the product itself is deleted."
 *
 * 1. Register a seller account and authenticate.
 * 2. Create a product with known original values (name, description, base_price).
 * 3. Edit the product to trigger automatic snapshot creation of the pre-edit state.
 * 4. List snapshots to obtain the snapshot ID of the captured pre-edit state.
 * 5. Soft-delete the product (visibility = 'deleted').
 * 6. Retrieve the snapshot using the same product and snapshot IDs.
 * 7. Validate that the snapshot data matches the original pre-edit state.
 */
export async function test_api_seller_product_snapshot_view_after_product_deletion(
  connection: api.IConnection,
): Promise<void> {
  // ---- Step 1: Seller authentication ----
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // ---- Step 2: Create a product with known original values ----
  const originalName = RandomGenerator.paragraph({ sentences: 2 });
  const originalDescription = RandomGenerator.content({ paragraphs: 2 });
  const originalBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
  >();
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: originalName,
        description: originalDescription,
        base_price: originalBasePrice,
      },
    },
  );
  typia.assert(product);
  // ---- Step 3: Edit the product to trigger snapshot creation ----
  const updatedName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.content({ paragraphs: 2 });
  const updatedBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
  >();
  const updatedProduct =
    await api.functional.eCommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: updatedName,
          description: updatedDescription,
          base_price: updatedBasePrice,
        } satisfies IECommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // ---- Step 4: List snapshots to obtain the snapshotId ----
  const snapshotList =
    await api.functional.eCommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IECommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotList);
  TestValidator.predicate(
    "at least one snapshot exists after edit",
    () => snapshotList.data.length > 0,
  );
  const snapshotSummary = snapshotList.data[0]!;
  typia.assert(snapshotSummary);
  // ---- Step 5: Soft-delete the product ----
  await api.functional.eCommerceMall.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // ---- Step 6: Retrieve the snapshot after product deletion ----
  const snapshot =
    await api.functional.eCommerceMall.seller.products.snapshots.at(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotSummary.id,
      },
    );
  typia.assert(snapshot);
  // ---- Step 7: Validate snapshot preserves original pre-edit state ----
  TestValidator.equals(
    "snapshot preserves original product name",
    snapshot.name,
    originalName,
  );
  TestValidator.equals(
    "snapshot preserves original product description",
    snapshot.description,
    originalDescription,
  );
  TestValidator.equals(
    "snapshot preserves original base price",
    snapshot.base_price,
    originalBasePrice,
  );
}
