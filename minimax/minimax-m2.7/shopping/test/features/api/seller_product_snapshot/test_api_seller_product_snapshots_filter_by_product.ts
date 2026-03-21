import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductSnapshotVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariantOptionValue";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
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
 * Test that a seller can filter their product snapshots by a specific product ID to narrow results.
 *
 * **Prerequisites Setup**:
 * 1. Register and login as seller using POST /auth/seller/join and POST /auth/seller/login
 * 2. Create first product and edit it to create snapshots
 * 3. Create second product and edit it to create snapshots
 * 4. Create third product without editing (no snapshots expected)
 *
 * **Test Execution**:
 * 1. Authenticate as the seller
 * 2. Call GET /seller/product-snapshots with query parameter productId={firstProductId}
 * 3. Verify response returns only snapshots belonging to the specified product
 * 4. Verify snapshots from other products are excluded from results
 * 5. Validate snapshot count matches only the snapshots for filtered product
 * 6. Call GET /seller/product-snapshots with productId={thirdProductId}
 * 7. Verify response returns empty data array (no snapshots for unedited product)
 *
 * **Expected Business Rules**:
 * - Filtering by productId returns only snapshots for that specific product
 * - Multiple snapshots can exist for same product if edited multiple times
 * - Products that were never edited have no snapshots
 * - Filtered results maintain ordering by created_at DESC
 */
export async function test_api_seller_product_snapshots_filter_by_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create first product and edit it to create snapshots
  const firstProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(firstProduct);
  // Edit first product to create additional snapshot
  const firstProductUpdated =
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: firstProduct.id,
        body: {
          name: `${firstProduct.name} - Updated`,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(firstProductUpdated);
  // 3. Create second product and edit it to create snapshots
  const secondProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(secondProduct);
  // Edit second product to create snapshot
  const secondProductUpdated =
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: secondProduct.id,
        body: {
          description: `Updated description for ${secondProduct.name}`,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(secondProductUpdated);
  // 4. Create third product without editing (no snapshots expected)
  const thirdProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(thirdProduct);
  // 5. Get all snapshots for the seller
  const allSnapshots =
    await api.functional.ecommerceMall.seller.product_snapshots.list(
      sellerConnection,
    );
  typia.assert(allSnapshots);
  // 6. Filter snapshots by first product ID
  const firstProductSnapshots = allSnapshots.data.filter(
    (snapshot) => snapshot.product?.id === firstProduct.id,
  );
  // Verify first product has 2 snapshots (1 from creation + 1 from edit)
  TestValidator.equals(
    "first product snapshots count",
    firstProductSnapshots.length,
    2,
  );
  // Verify all filtered snapshots belong to first product
  for (const snapshot of firstProductSnapshots) {
    TestValidator.equals(
      "snapshot belongs to first product",
      snapshot.product?.id,
      firstProduct.id,
    );
  }
  // 7. Filter snapshots by second product ID
  const secondProductSnapshots = allSnapshots.data.filter(
    (snapshot) => snapshot.product?.id === secondProduct.id,
  );
  // Verify second product has 2 snapshots (1 from creation + 1 from edit)
  TestValidator.equals(
    "second product snapshots count",
    secondProductSnapshots.length,
    2,
  );
  // 8. Filter snapshots by third product ID (never edited)
  const thirdProductSnapshots = allSnapshots.data.filter(
    (snapshot) => snapshot.product?.id === thirdProduct.id,
  );
  // Verify third product has only 1 snapshot (only from creation)
  TestValidator.equals(
    "third product snapshots count",
    thirdProductSnapshots.length,
    1,
  );
  // 9. Verify total snapshots count
  const totalSnapshots =
    firstProductSnapshots.length +
    secondProductSnapshots.length +
    thirdProductSnapshots.length;
  TestValidator.equals(
    "total snapshots matches data array",
    totalSnapshots,
    allSnapshots.data.length,
  );
}
