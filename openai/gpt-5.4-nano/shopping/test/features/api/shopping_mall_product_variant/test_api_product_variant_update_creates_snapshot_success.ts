import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_product_variants_create } from "../../../generate/generate_random_shopping_mall_member_product_variants_create";
import { generate_random_shopping_mall_member_products_create_product } from "../../../generate/generate_random_shopping_mall_member_products_create_product";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_variant_update_creates_snapshot_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate seller-capable member
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(sellerConnection, {});
  typia.assert(authorized);
  // 2) Create seller-owned product (let generator prepare a valid category/code)
  const product =
    await generate_random_shopping_mall_member_products_create_product(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3) Create a product variant under the seller-owned product
  const beforeVariant =
    await generate_random_shopping_mall_member_product_variants_create(
      sellerConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
        } satisfies Partial<IShoppingMallProductVariant.ICreate> &
          Pick<IShoppingMallProductVariant.ICreate, "shopping_mall_product_id">,
      },
    );
  typia.assert(beforeVariant);
  const productVariantId = beforeVariant.id;
  // 4) GET before state
  const variantBefore =
    await api.functional.shoppingMall.member.productVariants.at(
      sellerConnection,
      { productVariantId },
    );
  typia.assert(variantBefore);
  // 5) PUT update (including is_active=false)
  const updatedAtBefore = variantBefore.updated_at;
  const nextCode = RandomGenerator.alphaNumeric(12);
  const nextTitle = RandomGenerator.name(2);
  const nextOptionValue = RandomGenerator.alphabets(8);
  const nextPrice = typia.random<number>();
  const nextIsActive = false;
  const updatedVariant =
    await api.functional.shoppingMall.member.productVariants.update(
      sellerConnection,
      {
        productVariantId,
        body: {
          code: nextCode,
          title: nextTitle,
          option_value: nextOptionValue,
          price: nextPrice,
          is_active: nextIsActive,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 6) Validate updated fields exactly match submitted values
  TestValidator.equals(
    "variant id unchanged",
    updatedVariant.id,
    productVariantId,
  );
  TestValidator.equals("code updated", updatedVariant.code, nextCode);
  TestValidator.equals("title updated", updatedVariant.title, nextTitle);
  TestValidator.equals(
    "option_value updated",
    updatedVariant.option_value,
    nextOptionValue,
  );
  TestValidator.equals("price updated", updatedVariant.price, nextPrice);
  TestValidator.equals(
    "is_active updated",
    updatedVariant.is_active,
    nextIsActive,
  );
  // Other attributes unchanged
  TestValidator.equals(
    "product id unchanged",
    updatedVariant.product.id,
    variantBefore.product.id,
  );
  TestValidator.predicate(
    "updated_at advances",
    updatedVariant.updated_at !== updatedAtBefore,
  );
  // 7) Verify snapshot/history created and matches accepted values
  const snapshotPage =
    await api.functional.shoppingMall.member.productVariantSnapshots.index(
      sellerConnection,
      {
        body: {
          productVariantId,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  const snapshots = snapshotPage.data;
  TestValidator.predicate("at least one snapshot exists", snapshots.length > 0);
  const matched = snapshots.filter(
    (s) =>
      s.code === nextCode &&
      s.name === nextTitle &&
      s.price === nextPrice &&
      s.productVariant.id === productVariantId,
  );
  TestValidator.predicate(
    "snapshot for updated state exists",
    matched.length > 0,
  );
  const snapshot = matched[0];
  TestValidator.equals("snapshot code", snapshot.code, nextCode);
  TestValidator.equals("snapshot name", snapshot.name, nextTitle);
  TestValidator.equals("snapshot price", snapshot.price, nextPrice);
  TestValidator.equals(
    "snapshot is_available reflects is_active",
    snapshot.is_available,
    nextIsActive,
  );
  TestValidator.notEquals(
    "snapshot differs from before title",
    variantBefore.title,
    snapshot.name,
  );
}
