import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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

export async function test_api_product_variant_update_forbidden_other_seller(
  connection: api.IConnection,
): Promise<void> {
  // Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_member_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(sellerA);

  const sellerAProduct = await generate_random_shopping_mall_member_products_create_product(
    sellerAConnection,
    {
      body: prepare_random_shopping_mall_product() satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(sellerAProduct);

  const sellerAOriginalVariant =
    await generate_random_shopping_mall_member_product_variants_create(
      sellerAConnection,
      {
        body: {
          shopping_mall_product_id: sellerAProduct.id,
          code: `SKU-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(),
          option_value: RandomGenerator.alphabets(6),
          price: typia.random<number>(),
          is_active: typia.random<boolean>(),
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(sellerAOriginalVariant);

  const sellerAProductVariantId = sellerAOriginalVariant.id;
  const before = await api.functional.shoppingMall.member.productVariants.at(
    sellerAConnection,
    {
      productVariantId: sellerAProductVariantId,
    },
  );
  typia.assert(before);

  const beforeSnapshot = {
    code: before.code,
    title: before.title,
    option_value: before.option_value,
    price: before.price,
    is_active: before.is_active,
  };

  // Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_member_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(sellerB);

  const unauthorizedUpdateBody: IShoppingMallProductVariant.IUpdate = {
    code: `SKU-${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.name(),
    option_value: RandomGenerator.alphabets(6),
    price: before.price + 1,
    is_active: !before.is_active,
  };

  await TestValidator.error("forbidden update for other seller", async () => {
    await api.functional.shoppingMall.member.productVariants.update(
      sellerBConnection,
      {
        productVariantId: sellerAProductVariantId,
        body: unauthorizedUpdateBody,
      },
    );
  });

  const after = await api.functional.shoppingMall.member.productVariants.at(
    sellerAConnection,
    {
      productVariantId: sellerAProductVariantId,
    },
  );
  typia.assert(after);

  TestValidator.equals(
    "variant code unchanged",
    after.code,
    beforeSnapshot.code,
  );
  TestValidator.equals(
    "variant title unchanged",
    after.title,
    beforeSnapshot.title,
  );
  TestValidator.equals(
    "variant option_value unchanged",
    after.option_value,
    beforeSnapshot.option_value,
  );
  TestValidator.equals(
    "variant price unchanged",
    after.price,
    beforeSnapshot.price,
  );
  TestValidator.equals(
    "variant is_active unchanged",
    after.is_active,
    beforeSnapshot.is_active,
  );
}
