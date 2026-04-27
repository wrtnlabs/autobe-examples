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

export async function test_api_product_snapshot_view_after_edit(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  const originalName = product.name;
  const originalBasePrice = product.base_price;
  const edit1Name = RandomGenerator.paragraph({ sentences: 2 });
  const edit1Description = RandomGenerator.paragraph({ sentences: 3 });
  const updated1 = await api.functional.eCommerceMall.seller.products.update(
    sellerConnection,
    {
      productId: product.id,
      body: {
        name: edit1Name,
        description: edit1Description,
      } satisfies IECommerceMallProduct.IUpdate,
    },
  );
  typia.assert(updated1);
  const newBasePrice = originalBasePrice + 500;
  const updated2 = await api.functional.eCommerceMall.seller.products.update(
    sellerConnection,
    {
      productId: product.id,
      body: {
        base_price: newBasePrice,
      } satisfies IECommerceMallProduct.IUpdate,
    },
  );
  typia.assert(updated2);
  const snapshotPage =
    await api.functional.eCommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {},
      },
    );
  typia.assert(snapshotPage);
  TestValidator.equals("pagination current", snapshotPage.pagination.current, 1);
  TestValidator.equals("pagination records", snapshotPage.pagination.records, 2);
  TestValidator.equals("pagination pages", snapshotPage.pagination.pages, 1);
  TestValidator.equals("snapshot count", snapshotPage.data.length, 2);
  const firstSnapshot = snapshotPage.data[0]!;
  const secondSnapshot = snapshotPage.data[1]!;
  TestValidator.equals("first snapshot name matches edit 1 name", firstSnapshot.name, edit1Name);
  TestValidator.equals("first snapshot base_price is original", firstSnapshot.base_price, originalBasePrice);
  TestValidator.equals("second snapshot name is original", secondSnapshot.name, originalName);
  TestValidator.equals("second snapshot base_price is original", secondSnapshot.base_price, originalBasePrice);
  TestValidator.equals("first snapshot product id", firstSnapshot.product.id, product.id);
  TestValidator.equals("second snapshot product id", secondSnapshot.product.id, product.id);
  TestValidator.predicate(
    "snapshots ordered newest first",
    new Date(firstSnapshot.created_at).getTime() >=
      new Date(secondSnapshot.created_at).getTime(),
  );
}