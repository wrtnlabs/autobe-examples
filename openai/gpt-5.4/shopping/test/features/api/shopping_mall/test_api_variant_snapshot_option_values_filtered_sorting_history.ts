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

export async function test_api_variant_snapshot_option_values_filtered_sorting_history(
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
    },
  });
  typia.assert(seller);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: `${RandomGenerator.name()} ${RandomGenerator.alphabets(4)}`,
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          status: "active",
        },
      },
    );
  typia.assert(product);
  const initialVariant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: `SKU-${RandomGenerator.alphabets(8)}`,
          option_summary: `${RandomGenerator.name(1)} / ${RandomGenerator.name(1)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(initialVariant);
  const updatedVariant =
    await api.functional.shoppingMall.seller.seller_products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: initialVariant.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphabets(8)}`,
          option_summary: `${RandomGenerator.name(1)} / ${RandomGenerator.name(1)} / ${RandomGenerator.name(1)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  TestValidator.notEquals(
    "variant sku updated",
    updatedVariant.sku_code,
    initialVariant.sku_code,
  );
  const snapshotsBefore =
    await api.functional.shoppingMall.seller.seller_products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: initialVariant.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsBefore);
  TestValidator.predicate(
    "snapshot created after update",
    snapshotsBefore.data.length > 0,
  );
  const targetSnapshotCandidate =
    snapshotsBefore.data.find((snapshot) => snapshot.optionValues.length > 0) ??
    snapshotsBefore.data[0];
  TestValidator.predicate(
    "target snapshot exists",
    targetSnapshotCandidate !== undefined,
  );
  const targetSnapshot =
    targetSnapshotCandidate as IShoppingMallProductVariantSnapshot.ISummary;
  const preservedOptionValues = [...targetSnapshot.optionValues];
  const preservedIds = new Set(preservedOptionValues.map((row) => row.id));
  const defaultOrderFirst =
    await api.functional.shoppingMall.seller.seller_products.variants.snapshots.option_values.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: initialVariant.id,
        productVariantSnapshotId: targetSnapshot.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallProductVariantSnapshotOptionValue.IRequest,
      },
    );
  typia.assert(defaultOrderFirst);
  const defaultOrderSecond =
    await api.functional.shoppingMall.seller.seller_products.variants.snapshots.option_values.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: initialVariant.id,
        productVariantSnapshotId: targetSnapshot.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallProductVariantSnapshotOptionValue.IRequest,
      },
    );
  typia.assert(defaultOrderSecond);
  TestValidator.predicate(
    "default order rows stay within selected snapshot scope",
    defaultOrderFirst.data.every((row) => preservedIds.has(row.id)),
  );
  TestValidator.equals(
    "default order is stable across repeated reads",
    defaultOrderFirst.data.map((row) => row.id),
    defaultOrderSecond.data.map((row) => row.id),
  );
  TestValidator.equals(
    "default order follows created_at then id",
    defaultOrderFirst.data.map((row) => row.id),
    [...defaultOrderFirst.data]
      .sort(
        (x, y) =>
          x.created_at.localeCompare(y.created_at) || x.id.localeCompare(y.id),
      )
      .map((row) => row.id),
  );
  if (preservedOptionValues.length > 0) {
    const exactName = preservedOptionValues[0].name;
    const exactValue = preservedOptionValues[0].value;
    const searchSource = `${exactName} ${exactValue}`;
    const searchKeyword = searchSource.slice(
      0,
      Math.max(1, Math.min(3, searchSource.length)),
    );
    const byName =
      await api.functional.shoppingMall.seller.seller_products.variants.snapshots.option_values.index(
        sellerConnection,
        {
          productId: product.id,
          variantId: initialVariant.id,
          productVariantSnapshotId: targetSnapshot.id,
          body: {
            name: exactName,
            page: 1,
            limit: 100,
          } satisfies IShoppingMallProductVariantSnapshotOptionValue.IRequest,
        },
      );
    typia.assert(byName);
    TestValidator.predicate(
      "exact name filter stays within selected snapshot scope",
      byName.data.every((row) => preservedIds.has(row.id)),
    );
    TestValidator.predicate(
      "exact name filter matches only requested name",
      byName.data.every((row) => row.name === exactName),
    );
    TestValidator.equals(
      "exact name filter count matches preserved snapshot rows",
      byName.data.length,
      preservedOptionValues.filter((row) => row.name === exactName).length,
    );
    const byValue =
      await api.functional.shoppingMall.seller.seller_products.variants.snapshots.option_values.index(
        sellerConnection,
        {
          productId: product.id,
          variantId: initialVariant.id,
          productVariantSnapshotId: targetSnapshot.id,
          body: {
            value: exactValue,
            page: 1,
            limit: 100,
          } satisfies IShoppingMallProductVariantSnapshotOptionValue.IRequest,
        },
      );
    typia.assert(byValue);
    TestValidator.predicate(
      "exact value filter stays within selected snapshot scope",
      byValue.data.every((row) => preservedIds.has(row.id)),
    );
    TestValidator.predicate(
      "exact value filter matches only requested value",
      byValue.data.every((row) => row.value === exactValue),
    );
    TestValidator.equals(
      "exact value filter count matches preserved snapshot rows",
      byValue.data.length,
      preservedOptionValues.filter((row) => row.value === exactValue).length,
    );
    const bySearch =
      await api.functional.shoppingMall.seller.seller_products.variants.snapshots.option_values.index(
        sellerConnection,
        {
          productId: product.id,
          variantId: initialVariant.id,
          productVariantSnapshotId: targetSnapshot.id,
          body: {
            search: searchKeyword,
            page: 1,
            limit: 100,
          } satisfies IShoppingMallProductVariantSnapshotOptionValue.IRequest,
        },
      );
    typia.assert(bySearch);
    TestValidator.predicate(
      "keyword search stays within selected snapshot scope",
      bySearch.data.every((row) => preservedIds.has(row.id)),
    );
    TestValidator.predicate(
      "keyword search matches name or value in selected snapshot",
      bySearch.data.every(
        (row) =>
          row.name.includes(searchKeyword) || row.value.includes(searchKeyword),
      ),
    );
    const sortedByName =
      await api.functional.shoppingMall.seller.seller_products.variants.snapshots.option_values.index(
        sellerConnection,
        {
          productId: product.id,
          variantId: initialVariant.id,
          productVariantSnapshotId: targetSnapshot.id,
          body: {
            sort: "name",
            page: 1,
            limit: 100,
          } satisfies IShoppingMallProductVariantSnapshotOptionValue.IRequest,
        },
      );
    typia.assert(sortedByName);
    TestValidator.predicate(
      "name sort stays within selected snapshot scope",
      sortedByName.data.every((row) => preservedIds.has(row.id)),
    );
    TestValidator.predicate(
      "name sort is monotonic ascending",
      sortedByName.data.every(
        (row, index, array) =>
          index === 0 || array[index - 1].name.localeCompare(row.name) <= 0,
      ),
    );
    const sortedByValueDesc =
      await api.functional.shoppingMall.seller.seller_products.variants.snapshots.option_values.index(
        sellerConnection,
        {
          productId: product.id,
          variantId: initialVariant.id,
          productVariantSnapshotId: targetSnapshot.id,
          body: {
            sort: "-value",
            page: 1,
            limit: 100,
          } satisfies IShoppingMallProductVariantSnapshotOptionValue.IRequest,
        },
      );
    typia.assert(sortedByValueDesc);
    TestValidator.predicate(
      "descending value sort stays within selected snapshot scope",
      sortedByValueDesc.data.every((row) => preservedIds.has(row.id)),
    );
    TestValidator.predicate(
      "descending value sort is monotonic descending",
      sortedByValueDesc.data.every(
        (row, index, array) =>
          index === 0 || array[index - 1].value.localeCompare(row.value) >= 0,
      ),
    );
  } else {
    TestValidator.equals(
      "empty snapshot yields empty option-value page",
      defaultOrderFirst.data,
      [],
    );
  }
  const snapshotsAfter =
    await api.functional.shoppingMall.seller.seller_products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: initialVariant.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsAfter);
  const targetSnapshotAfterCandidate = snapshotsAfter.data.find(
    (snapshot) => snapshot.id === targetSnapshot.id,
  );
  TestValidator.predicate(
    "target snapshot remains available after browsing",
    targetSnapshotAfterCandidate !== undefined,
  );
  const targetSnapshotAfter =
    targetSnapshotAfterCandidate as IShoppingMallProductVariantSnapshot.ISummary;
  TestValidator.equals(
    "snapshot option values remain unchanged after browsing",
    targetSnapshotAfter.optionValues,
    preservedOptionValues,
  );
}
