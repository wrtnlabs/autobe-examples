import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductSnapshot";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

/**
 * Test seller can view product snapshots after product deletion.
 *
 * Validates the snapshot preservation business rule that ensures product modification history remains accessible even after the product itself is soft-deleted. This is critical for audit trails, dispute resolution, and compliance verification.
 *
 * The test follows a complete lifecycle: seller authentication, product creation, multiple updates to generate snapshots, product deletion, and finally snapshot retrieval to confirm historical data integrity.
 *
 * 1. Seller authenticates via join operation with randomized credentials.
 * 2. Initial product is created with name, description, category, and base price.
 * 3. Product is updated three times with different values to create multiple snapshots.
 * 4. Product is deleted using the seller product erase endpoint.
 * 5. Snapshot listing endpoint is called with the deleted product ID.
 * 6. Validates snapshots are successfully retrieved despite product deletion.
 * 7. Verifies snapshot data contains expected historical values from each update.
 */
export async function test_api_product_snapshot_view_deleted_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create initial product
  const initialProduct = await api.functional.ecommerce.seller.products.create(
    sellerConnection,
    {
      body: prepare_random_ecommerce_product({
        name: "Initial Product Name",
        description: "Initial product description",
      }),
    },
  );
  typia.assert(initialProduct);
  const productId = initialProduct.id;
  // Store initial values for validation
  const initialName = initialProduct.name;
  const initialBasePrice = initialProduct.basePrice;
  // 3. Update product multiple times to create snapshots
  const updatedName1 = "Updated Product Name V1";
  const updatedBasePrice1 = initialBasePrice + 1000;
  const updatedProduct1 = await api.functional.ecommerce.seller.products.update(
    sellerConnection,
    {
      productId,
      body: {
        name: updatedName1,
        base_price: updatedBasePrice1,
      } satisfies IEcommerceProduct.IUpdate,
    },
  );
  typia.assert(updatedProduct1);
  const updatedName2 = "Updated Product Name V2";
  const updatedBasePrice2 = initialBasePrice + 2000;
  const updatedProduct2 = await api.functional.ecommerce.seller.products.update(
    sellerConnection,
    {
      productId,
      body: {
        name: updatedName2,
        base_price: updatedBasePrice2,
      } satisfies IEcommerceProduct.IUpdate,
    },
  );
  typia.assert(updatedProduct2);
  const updatedName3 = "Updated Product Name V3";
  const updatedBasePrice3 = initialBasePrice + 3000;
  const updatedProduct3 = await api.functional.ecommerce.seller.products.update(
    sellerConnection,
    {
      productId,
      body: {
        name: updatedName3,
        base_price: updatedBasePrice3,
      } satisfies IEcommerceProduct.IUpdate,
    },
  );
  typia.assert(updatedProduct3);
  // 4. Delete the product
  await api.functional.ecommerce.seller.products.erase(sellerConnection, {
    productId,
  });
  // 5. Retrieve snapshots for deleted product
  const snapshots: IPageIEcommerceProductSnapshot.ISummary =
    await api.functional.ecommerce.seller.products.snapshots.index(
      sellerConnection,
      {
        productId,
        body: {} satisfies IEcommerceProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 6. Validate snapshot preservation after deletion
  TestValidator.predicate(
    "snapshots exist after product deletion",
    snapshots.data.length > 0,
  );
  // Should have at least 3 snapshots from the 3 updates
  TestValidator.predicate(
    "multiple snapshots created from updates",
    snapshots.data.length >= 3,
  );
  // 7. Verify snapshot data integrity - key business rule validation
  const snapshotNames = snapshots.data.map((s) => s.name);
  TestValidator.predicate(
    "initial product name preserved in snapshots",
    snapshotNames.includes(initialName),
  );
  TestValidator.predicate(
    "updated product names preserved in snapshots",
    snapshotNames.includes(updatedName1) &&
      snapshotNames.includes(updatedName2) &&
      snapshotNames.includes(updatedName3),
  );
  // Verify category_id is preserved across all snapshots
  TestValidator.predicate(
    "category_id preserved in all snapshots",
    snapshots.data.every((s) => s.category_id === initialProduct.category.id),
  );
  // Verify base_price values from all updates are preserved
  const basePrices = snapshots.data.map((s) => s.base_price);
  TestValidator.predicate(
    "all base_price values preserved in snapshots",
    basePrices.includes(initialBasePrice) &&
      basePrices.includes(updatedBasePrice1) &&
      basePrices.includes(updatedBasePrice2) &&
      basePrices.includes(updatedBasePrice3),
  );
}
