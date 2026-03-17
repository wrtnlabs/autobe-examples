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

export async function test_api_variant_snapshot_option_value_parent_chain_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(2),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
          status: "active",
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  const firstVariant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: `sku-${RandomGenerator.alphaNumeric(8)}`,
          option_summary: `Color ${RandomGenerator.alphabets(4)} / Size ${RandomGenerator.alphabets(3)}`,
          price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(firstVariant);
  const firstVariantUpdate =
    await api.functional.shoppingMall.seller.seller_products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: firstVariant.id,
        body: {
          sku_code: `sku-${RandomGenerator.alphaNumeric(8)}`,
          option_summary: `Updated ${RandomGenerator.name(2)}`,
          price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(firstVariantUpdate);
  const firstSnapshots =
    await api.functional.shoppingMall.seller.seller_products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: firstVariant.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(firstSnapshots);
  TestValidator.predicate(
    "first variant has snapshot history",
    firstSnapshots.data.length > 0,
  );
  let firstSnapshot: IShoppingMallProductVariantSnapshot.ISummary | null = null;
  let firstOptionValuesPage: IPageIShoppingMallProductVariantSnapshotOptionValue.ISummary | null =
    null;
  for (const snapshot of firstSnapshots.data) {
    const optionValuesPage =
      await api.functional.shoppingMall.seller.seller_products.variants.snapshots.option_values.index(
        sellerConnection,
        {
          productId: product.id,
          variantId: firstVariant.id,
          productVariantSnapshotId: snapshot.id,
          body: {
            page: 1,
            limit: 100,
          } satisfies IShoppingMallProductVariantSnapshotOptionValue.IRequest,
        },
      );
    typia.assert(optionValuesPage);
    if (optionValuesPage.data.length > 0) {
      firstSnapshot = snapshot;
      firstOptionValuesPage = optionValuesPage;
      break;
    }
  }
  TestValidator.predicate(
    "first lineage contains snapshot option values",
    firstSnapshot !== null && firstOptionValuesPage !== null,
  );
  const selectedFirstSnapshot = typia.assert(firstSnapshot!);
  const selectedFirstOptionValuesPage = typia.assert(firstOptionValuesPage!);
  const firstOptionValue = selectedFirstOptionValuesPage.data[0]!;
  const correctDetail =
    await api.functional.shoppingMall.seller.seller_products.variants.snapshots.option_values.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: firstVariant.id,
        productVariantSnapshotId: selectedFirstSnapshot.id,
        optionValueId: firstOptionValue.id,
      },
    );
  typia.assert(correctDetail);
  TestValidator.equals(
    "correct option value id",
    correctDetail.id,
    firstOptionValue.id,
  );
  TestValidator.equals(
    "correct option value name",
    correctDetail.name,
    firstOptionValue.name,
  );
  TestValidator.equals(
    "correct option value value",
    correctDetail.value,
    firstOptionValue.value,
  );
  TestValidator.equals(
    "correct option value snapshot id",
    correctDetail.productVariantSnapshot.id,
    selectedFirstSnapshot.id,
  );
  const secondVariant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: `sku-${RandomGenerator.alphaNumeric(8)}`,
          option_summary: `Color ${RandomGenerator.alphabets(4)} / Fit ${RandomGenerator.alphabets(3)}`,
          price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(secondVariant);
  const secondVariantUpdate =
    await api.functional.shoppingMall.seller.seller_products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: secondVariant.id,
        body: {
          sku_code: `sku-${RandomGenerator.alphaNumeric(8)}`,
          option_summary: `Updated ${RandomGenerator.name(2)}`,
          price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(secondVariantUpdate);
  const secondSnapshots =
    await api.functional.shoppingMall.seller.seller_products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: secondVariant.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(secondSnapshots);
  TestValidator.predicate(
    "second variant has snapshot history",
    secondSnapshots.data.length > 0,
  );
  const secondSnapshot =
    secondSnapshots.data.find(
      (snapshot) => snapshot.id !== selectedFirstSnapshot.id,
    ) ?? secondSnapshots.data[0]!;
  await TestValidator.httpError(
    "reject option value lookup through mismatched variant snapshot chain",
    [400, 403, 404, 422],
    async () => {
      await api.functional.shoppingMall.seller.seller_products.variants.snapshots.option_values.at(
        sellerConnection,
        {
          productId: product.id,
          variantId: secondVariant.id,
          productVariantSnapshotId: secondSnapshot.id,
          optionValueId: firstOptionValue.id,
        },
      );
    },
  );
}
