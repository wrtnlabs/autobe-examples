import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function test_api_product_snapshots_deleted_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Edit product 3 times to create multiple snapshots
  const editCounts = ArrayUtil.repeat(3, () => ({
    name: RandomGenerator.paragraph({ sentences: 2 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
    >(),
  }));
  for (let i = 0; i < editCounts.length; i++) {
    const edit = await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: editCounts[i].name,
          base_price: editCounts[i].base_price,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
    typia.assert(edit);
  }
  // 4. Get snapshots before deletion
  const snapshotsBefore =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<200>
          >(),
          sort_by: "created_at",
          sort_direction: "DESC",
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsBefore);
  const snapshotCountBefore = snapshotsBefore.pagination.records;
  TestValidator.predicate(
    "snapshots created before deletion",
    snapshotCountBefore > 0,
  );
  // 5. Delete the product
  await api.functional.ecommerceMall.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // 6. Get snapshots after deletion
  const snapshotsAfter =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<200>
          >(),
          sort_by: "created_at",
          sort_direction: "DESC",
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsAfter);
  // 7. Validate snapshots are preserved after deletion
  const snapshotCountAfter = snapshotsAfter.pagination.records;
  TestValidator.equals(
    "snapshot count preserved after deletion",
    snapshotCountAfter,
    snapshotCountBefore,
  );
  // 8. Verify data integrity in snapshots
  if (snapshotsAfter.data.length > 0) {
    const firstSnapshot = snapshotsAfter.data[0];
    typia.assert(firstSnapshot);
    TestValidator.predicate(
      "snapshot has name",
      firstSnapshot.name !== null && firstSnapshot.name.length > 0,
    );
    TestValidator.predicate(
      "snapshot has base_price",
      firstSnapshot.base_price !== null && firstSnapshot.base_price > 0,
    );
    TestValidator.predicate(
      "snapshot has category",
      firstSnapshot.category !== null,
    );
    TestValidator.predicate(
      "category has id",
      firstSnapshot.category.id !== null &&
        firstSnapshot.category.id.length > 0,
    );
    TestValidator.predicate(
      "category has name",
      firstSnapshot.category.name !== null &&
        firstSnapshot.category.name.length > 0,
    );
    TestValidator.predicate(
      "entity_status exists",
      firstSnapshot.entity_status !== null &&
        firstSnapshot.entity_status.length > 0,
    );
    TestValidator.predicate(
      "action exists",
      firstSnapshot.action !== null && firstSnapshot.action.length > 0,
    );
  }
  // 9. Verify all snapshots have preserved entity_status and action
  snapshotsAfter.data.forEach((snapshot, index) => {
    TestValidator.predicate(
      `snapshot ${index} has entity_status`,
      snapshot.entity_status !== null && snapshot.entity_status.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${index} has action`,
      snapshot.action !== null && snapshot.action.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${index} has created_at`,
      snapshot.created_at !== null,
    );
    TestValidator.predicate(
      `snapshot ${index} has name`,
      snapshot.name !== null && snapshot.name.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${index} has base_price`,
      snapshot.base_price !== null && snapshot.base_price > 0,
    );
  });
}
