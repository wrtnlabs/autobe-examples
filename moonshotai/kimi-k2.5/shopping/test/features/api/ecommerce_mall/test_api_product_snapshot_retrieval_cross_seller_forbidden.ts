import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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

export async function test_api_product_snapshot_retrieval_cross_seller_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, { body: {} });
  // 2. Create a product as Seller A
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerAConnection,
    { body: { basePrice: 10000 } },
  );
  // 3. Update the product to create a snapshot
  await api.functional.ecommerceMall.seller.products.update(sellerAConnection, {
    productId: product.id,
    body: {
      name: `${product.name} (Updated)`,
    } satisfies IEcommerceMallProduct.IUpdate,
  });
  // 4. Retrieve the snapshot list to get snapshotId
  const snapshotPage: IPageIEcommerceMallProductSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerAConnection,
      {
        productId: product.id,
        body: {
          cursor: null,
          limit: 10,
          createdAtFrom: null,
          createdAtTo: null,
          sort: "created_at_DESC",
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  // Get the first snapshot from the list
  const snapshotId = snapshotPage.data[0]?.id;
  if (!snapshotId) {
    throw new Error("No snapshots found after product update");
  }
  // 5. Authenticate as Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, { body: {} });
  // 6. Attempt to retrieve Seller A's product snapshot using Seller B's credentials
  await TestValidator.httpError(
    "should return 403 when Seller B attempts to access Seller A's product snapshot",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.products.snapshots.at(
        sellerBConnection,
        {
          productId: product.id,
          snapshotId: snapshotId,
        },
      );
    },
  );
}
