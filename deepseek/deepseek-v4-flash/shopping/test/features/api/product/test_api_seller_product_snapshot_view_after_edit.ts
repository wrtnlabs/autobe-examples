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
 * Test that editing a product creates a snapshot preserving the pre-edit state.
 *
 * Verifies the automatic product snapshot mechanism: when a seller edits a product via the PUT endpoint, the system creates an immutable snapshot capturing the complete pre-edit state. The test confirms that the snapshot retains the original name, description, and base price, while the product itself reflects the updated values.
 *
 * 1. Authenticate as a seller via `authorize_seller_join`.
 * 2. Create a product with known initial attributes (name, description, base_price).
 * 3. Edit the product with different attribute values to trigger automatic snapshot creation.
 * 4. Retrieve the snapshot list and obtain the snapshot ID.
 * 5. Fetch the full snapshot detail and validate that it preserves the pre-edit values.
 */
export async function test_api_seller_product_snapshot_view_after_edit(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(sellerAuthorized);
  // Step 2: Create product with known original attributes
  const originalName = "Original Name";
  const originalDescription = "Original description";
  const originalBasePrice = 100;
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
  // Step 3: Update product attributes to trigger snapshot creation
  const updatedProduct =
    await api.functional.eCommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: "Updated Name",
          description: "Updated description",
          base_price: 150,
        } satisfies IECommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // Step 4: List snapshots to obtain the snapshotId
  const snapshotPage =
    await api.functional.eCommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {} satisfies IECommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  TestValidator.predicate(
    "snapshot list contains at least one entry after edit",
    snapshotPage.data.length >= 1,
  );
  const snapshotId = snapshotPage.data[0].id;
  // Step 5: Retrieve the full snapshot detail
  const snapshot =
    await api.functional.eCommerceMall.seller.products.snapshots.at(
      sellerConnection,
      {
        productId: product.id,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // Step 6: Validate snapshot preserves pre-edit state
  TestValidator.equals(
    "snapshot name preserves pre-edit value",
    snapshot.name,
    originalName,
  );
  TestValidator.equals(
    "snapshot description preserves pre-edit value",
    snapshot.description,
    originalDescription,
  );
  TestValidator.equals(
    "snapshot base_price preserves pre-edit value",
    snapshot.base_price,
    originalBasePrice,
  );
  TestValidator.predicate(
    "snapshot created_at is a valid non-empty timestamp",
    typeof snapshot.created_at === "string" && snapshot.created_at.length > 0,
  );
}
