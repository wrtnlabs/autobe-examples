import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshotOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_variant_snapshot_review_other_seller_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const requesterConnection: api.IConnection = { host: connection.host };
  const requesterSeller = await authorize_seller_join(requesterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(requesterSeller);
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerSeller = await authorize_seller_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(ownerSeller);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      ownerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: 100,
          status: RandomGenerator.alphabets(8),
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      ownerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          option_summary: RandomGenerator.paragraph({ sentences: 3 }),
          price: 150,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const snapshotPage =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      ownerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 100,
          sort: "created_at_desc",
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  TestValidator.predicate(
    "owner product has snapshot history",
    snapshotPage.data.length > 0,
  );
  const productSnapshot = snapshotPage.data[0];
  typia.assert(productSnapshot);
  const variantSnapshotPage =
    await api.functional.shoppingMall.seller.products.snapshots.variant_snapshots.index(
      ownerConnection,
      {
        productId: product.id,
        productSnapshotId: productSnapshot.id,
        body: {
          page: 1,
          limit: 100,
          sort: "created_at_desc",
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(variantSnapshotPage);
  TestValidator.predicate(
    "owner product snapshot has variant snapshot history",
    variantSnapshotPage.data.length > 0,
  );
  const variantSnapshot = variantSnapshotPage.data[0];
  typia.assert(variantSnapshot);
  await TestValidator.httpError(
    "seller cannot review another seller variant snapshot",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.seller.products.snapshots.variant_snapshots.at(
        requesterConnection,
        {
          productId: product.id,
          productSnapshotId: productSnapshot.id,
          productVariantSnapshotId: variantSnapshot.id,
        },
      );
    },
  );
}
