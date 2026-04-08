import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductSnapshotVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariantOptionValue";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
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

export async function test_api_product_snapshot_access_denied_for_other_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. First seller joins and is authenticated
  const firstSellerConnection: api.IConnection = { host: connection.host };
  const firstSeller = await authorize_seller_join(firstSellerConnection, {});
  // 2. First seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    firstSellerConnection,
    {},
  );
  typia.assert(product);
  // 3. First seller updates the product to create a snapshot
  const updatedProduct =
    await api.functional.ecommerceMall.seller.products.update(
      firstSellerConnection,
      {
        productId: product.id,
        body: {
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // 4. First seller lists snapshots to get the snapshotId
  const snapshotList =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      firstSellerConnection,
      {
        productId: product.id,
        body: {} satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotList);
  // Get the most recent snapshot ID
  const snapshotId = snapshotList.data[0]!.id;
  // 5. Second seller joins and is authenticated
  const secondSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(secondSellerConnection, {});
  // 6. Second seller attempts to access first seller's product snapshot
  // This should be denied with 403 Forbidden
  await TestValidator.error(
    "second seller cannot access first seller's product snapshot",
    async () => {
      await api.functional.ecommerceMall.seller.products.snapshots.at(
        secondSellerConnection,
        {
          productId: product.id,
          snapshotId: snapshotId,
        },
      );
    },
  );
}
