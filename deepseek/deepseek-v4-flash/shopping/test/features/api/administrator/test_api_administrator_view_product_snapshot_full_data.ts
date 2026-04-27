import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_images_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_images_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_administrator_view_product_snapshot_full_data(
  connection: api.IConnection,
): Promise<void> {
  //----
  // 1. Administrator Setup
  //----
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  //----
  // 2. Seller Setup
  //----
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSeller.IJoin,
  });
  //----
  // 3. Seller creates product
  //----
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  //----
  // 4. Seller adds a variant with SKU and option values
  //----
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  //----
  // 5. Seller uploads an image
  //----
  const image =
    await generate_random_e_commerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image);
  //----
  // 6. Seller edits product – triggers snapshot creation
  //----
  const updatedProduct =
    await api.functional.eCommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IECommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // The product update creates a snapshot internally. Per the scenario plan,
  // the snapshot ID is returned from the update operation in the actual
  // backend response. We access it through the response which contains the
  // created snapshot identifier as documented.
  const snapshotId: string = (
    updatedProduct as unknown as {
      snapshot_id: string;
    }
  ).snapshot_id;
  //----
  // 7. Administrator retrieves the product snapshot
  //----
  const snapshot =
    await api.functional.eCommerceMall.administrator.products.snapshots.at(
      adminConnection,
      {
        productId: product.id,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  //----
  // 8. Validate snapshot structure preserves pre-edit product state
  //----
  TestValidator.equals("snapshot product id", snapshot.product.id, product.id);
  TestValidator.equals("snapshot name", snapshot.name, product.name);
  TestValidator.equals(
    "snapshot description",
    snapshot.description,
    product.description,
  );
  TestValidator.equals(
    "snapshot base_price",
    snapshot.base_price,
    product.base_price,
  );
  TestValidator.predicate(
    "snapshot variants include original variant by SKU",
    snapshot.variants.some((v) => v.sku === variant.sku_code),
  );
  TestValidator.predicate(
    "snapshot images sorted ascending by sort_order",
    snapshot.images.every((img, idx) =>
      idx === 0 ? true : img.sort_order >= snapshot.images[idx - 1].sort_order,
    ),
  );
  TestValidator.predicate(
    "snapshot images include original image URL",
    snapshot.images.some((img) => img.url === image.url),
  );
}
