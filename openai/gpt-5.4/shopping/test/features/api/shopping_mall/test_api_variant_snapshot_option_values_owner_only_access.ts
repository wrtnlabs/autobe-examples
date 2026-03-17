import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IPageIShoppingMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshotOptionValue";
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

export async function test_api_variant_snapshot_option_values_owner_only_access(
  connection: api.IConnection,
): Promise<void> {
  const ownerSellerConnection: api.IConnection = {
    host: connection.host,
  };
  const ownerSeller = await authorize_seller_join(ownerSellerConnection, {
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
      ownerSellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: 10000,
          status: "active",
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      ownerSellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: `sku-${RandomGenerator.alphaNumeric(8)}`,
          option_summary: RandomGenerator.paragraph({ sentences: 2 }),
          price: 11000,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const updatedVariant =
    await api.functional.shoppingMall.seller.seller_products.variants.update(
      ownerSellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sku_code: `sku-${RandomGenerator.alphaNumeric(8)}`,
          option_summary: RandomGenerator.paragraph({ sentences: 3 }),
          price: 12000,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  const snapshots =
    await api.functional.shoppingMall.seller.seller_products.variants.snapshots.index(
      ownerSellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 100,
          sort: "created_at desc",
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  TestValidator.predicate(
    "variant snapshot history exists after update",
    snapshots.data.length > 0,
  );
  const snapshot = snapshots.data[0]!;
  const attackerSellerConnection: api.IConnection = {
    host: connection.host,
  };
  const attackerSeller = await authorize_seller_join(attackerSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(attackerSeller);
  TestValidator.notEquals(
    "owner and attacker sellers differ",
    ownerSeller.id,
    attackerSeller.id,
  );
  await TestValidator.httpError(
    "foreign seller cannot access another seller's variant snapshot option values",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.seller.seller_products.variants.snapshots.option_values.index(
        attackerSellerConnection,
        {
          productId: product.id,
          variantId: variant.id,
          productVariantSnapshotId: snapshot.id,
          body: {
            page: 1,
            limit: 100,
            sort: "created_at",
          } satisfies IShoppingMallProductVariantSnapshotOptionValue.IRequest,
        },
      );
    },
  );
}
