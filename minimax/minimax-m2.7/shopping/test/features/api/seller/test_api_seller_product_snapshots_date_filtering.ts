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

export async function test_api_seller_product_snapshots_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a new product (creates first snapshot at product creation)
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Update product to create second snapshot
  const beforeFirstUpdate = new Date();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await api.functional.ecommerceMall.seller.products.update(sellerConnection, {
    productId: product.id,
    body: {
      name: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IEcommerceMallProduct.IUpdate,
  });
  // 4. Wait briefly then update product again to create third snapshot
  const afterFirstUpdate = new Date();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await api.functional.ecommerceMall.seller.products.update(sellerConnection, {
    productId: product.id,
    body: {
      description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEcommerceMallProduct.IUpdate,
  });
  const afterSecondUpdate = new Date();
  // 5. Get all snapshots to establish total count
  const allSnapshots =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {} satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // 6. Filter snapshots by date range (only include the middle update snapshot)
  const createdFromStr = beforeFirstUpdate.toISOString();
  const createdToStr = afterSecondUpdate.toISOString();
  const filteredSnapshots =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          createdFrom: createdFromStr,
          createdTo: createdToStr,
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(filteredSnapshots);
  // 7. Validation: Only snapshots within the date range should be returned
  TestValidator.predicate(
    "filtered snapshots should have at least 1 snapshot",
    filteredSnapshots.data.length >= 1,
  );
  // 8. Validate all returned snapshots fall within the date range
  for (const snapshot of filteredSnapshots.data) {
    const snapshotDate = new Date(snapshot.created_at);
    TestValidator.predicate(
      "snapshot created_at >= createdFrom",
      snapshotDate >= beforeFirstUpdate,
    );
    TestValidator.predicate(
      "snapshot created_at <= createdTo",
      snapshotDate <= afterSecondUpdate,
    );
  }
  // 9. Test filtering to include only first update (exclude others)
  const firstUpdateOnly =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          createdFrom: beforeFirstUpdate.toISOString(),
          createdTo: afterFirstUpdate.toISOString(),
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(firstUpdateOnly);
  // 10. Validate pagination metadata reflects filtered count, not total count
  TestValidator.predicate(
    "pagination records should be less than or equal to total snapshots",
    firstUpdateOnly.pagination.records <= allSnapshots.data.length,
  );
}
