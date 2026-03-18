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

export async function test_api_product_variant_update_duplicate_code_same_product_atomic(
  connection: api.IConnection,
): Promise<void> {
  // Register/authenticate a seller-capable member account
  const memberConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallMember.IJoin,
  });
  // Login as the same member for all subsequent actions
  const actorConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(actorConnection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallMember.ILogin,
  });
  // Create a seller-owned product
  const preparedProduct = prepare_random_shopping_mall_product();
  const product =
    await generate_random_shopping_mall_member_products_create_product(
      actorConnection,
      {
        body: {
          ...preparedProduct,
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_featured: false,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // Create two distinct variants under the same product
  const variantXCode = `X_${RandomGenerator.alphaNumeric(10)}`;
  const variantYCode = `Y_${RandomGenerator.alphaNumeric(10)}`;
  const variantX =
    await generate_random_shopping_mall_member_product_variants_create(
      actorConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          code: variantXCode,
          title: RandomGenerator.name(),
          option_value: RandomGenerator.alphabets(6),
          price: typia.random<number>() satisfies number,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variantX);
  const variantY =
    await generate_random_shopping_mall_member_product_variants_create(
      actorConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          code: variantYCode,
          title: RandomGenerator.name(),
          option_value: RandomGenerator.alphabets(6),
          price: typia.random<number>() satisfies number,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variantY);
  // Read both variants to ensure setup
  const variantXBefore =
    await api.functional.shoppingMall.member.productVariants.at(
      actorConnection,
      { productVariantId: variantX.id },
    );
  typia.assert(variantXBefore);
  const variantYBefore =
    await api.functional.shoppingMall.member.productVariants.at(
      actorConnection,
      { productVariantId: variantY.id },
    );
  typia.assert(variantYBefore);
  TestValidator.notEquals(
    "variant codes should be different before update",
    variantXBefore.code,
    variantYBefore.code,
  );
  // Capture snapshot history count before
  const snapshotPageBefore =
    await api.functional.shoppingMall.member.productVariantSnapshots.index(
      actorConnection,
      {
        body: {
          productVariantId: variantX.id,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPageBefore);
  const snapshotRecordsBefore = snapshotPageBefore.data;
  const snapshotCountBefore = snapshotPageBefore.pagination.records;
  // Attempt to update Variant X with Variant Y's code (duplicate within same product)
  await TestValidator.error(
    "reject duplicate variant code within the same product atomically",
    async () => {
      await api.functional.shoppingMall.member.productVariants.update(
        actorConnection,
        {
          productVariantId: variantX.id,
          body: {
            code: variantYBefore.code,
          } satisfies IShoppingMallProductVariant.IUpdate,
        },
      );
    },
  );
  // Verify Variant X unchanged after failure
  const variantXAfter =
    await api.functional.shoppingMall.member.productVariants.at(
      actorConnection,
      { productVariantId: variantX.id },
    );
  typia.assert(variantXAfter);
  TestValidator.equals(
    "code unchanged",
    variantXAfter.code,
    variantXBefore.code,
  );
  TestValidator.equals(
    "title unchanged",
    variantXAfter.title,
    variantXBefore.title,
  );
  TestValidator.equals(
    "price unchanged",
    variantXAfter.price,
    variantXBefore.price,
  );
  TestValidator.equals(
    "is_active unchanged",
    variantXAfter.is_active,
    variantXBefore.is_active,
  );
  // Verify Variant Y unchanged
  const variantYAfter =
    await api.functional.shoppingMall.member.productVariants.at(
      actorConnection,
      { productVariantId: variantY.id },
    );
  typia.assert(variantYAfter);
  TestValidator.equals(
    "variant Y unchanged - code",
    variantYAfter.code,
    variantYBefore.code,
  );
  TestValidator.equals(
    "variant Y unchanged - title",
    variantYAfter.title,
    variantYBefore.title,
  );
  TestValidator.equals(
    "variant Y unchanged - price",
    variantYAfter.price,
    variantYBefore.price,
  );
  TestValidator.equals(
    "variant Y unchanged - is_active",
    variantYAfter.is_active,
    variantYBefore.is_active,
  );
  // Verify snapshot history count unchanged for Variant X
  const snapshotPageAfter =
    await api.functional.shoppingMall.member.productVariantSnapshots.index(
      actorConnection,
      {
        body: {
          productVariantId: variantX.id,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPageAfter);
  TestValidator.equals(
    "snapshot record count unchanged",
    snapshotPageAfter.pagination.records,
    snapshotCountBefore,
  );
  TestValidator.equals(
    "snapshot page data unchanged",
    snapshotPageAfter.data,
    snapshotRecordsBefore,
  );
}
