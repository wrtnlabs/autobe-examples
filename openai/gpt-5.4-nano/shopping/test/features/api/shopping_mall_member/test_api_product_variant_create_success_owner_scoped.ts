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

export async function test_api_product_variant_create_success_owner_scoped(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a seller-capable member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });

  // 2) Create a seller-owned product
  const firstProduct =
    await generate_random_shopping_mall_member_products_create_product(
      memberConnection,
      {
        body: {
          code: `product-${RandomGenerator.alphabets(6)}`,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_featured: true,
        } satisfies Partial<IShoppingMallProduct.ICreate>,
      },
    );
  typia.assert(firstProduct);

  // 3) Create first variant
  const variantCode1 = `variant-${RandomGenerator.alphabets(8)}`;
  const variantInput1 = {
    shopping_mall_product_id: firstProduct.id,
    code: variantCode1,
    title: RandomGenerator.name(),
    option_value: RandomGenerator.alphabets(10),
    price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
    is_active: true,
  } satisfies IShoppingMallProductVariant.ICreate;
  const variant1 =
    await generate_random_shopping_mall_member_product_variants_create(
      memberConnection,
      {
        body: variantInput1,
      },
    );
  typia.assert(variant1);

  TestValidator.equals(
    "variant1.code matches request",
    variant1.code,
    variantCode1,
  );
  TestValidator.equals(
    "variant1.product.id matches product",
    variant1.product.id,
    firstProduct.id,
  );
  TestValidator.equals("variant1.is_active true", variant1.is_active, true);
  TestValidator.equals(
    "variant1.deleted_at is null",
    variant1.deleted_at,
    null,
  );
  TestValidator.equals(
    "variant1.option_value matches",
    variant1.option_value,
    variantInput1.option_value,
  );
  TestValidator.equals(
    "variant1.title matches",
    variant1.title,
    variantInput1.title,
  );
  TestValidator.equals(
    "variant1.price matches",
    variant1.price,
    variantInput1.price,
  );

  // 4) Validate seller scoping (returned product.seller.id matches authenticated member)
  const seller1 = typia.assert<{ id: typeof member.id }>(
    variant1.product.seller as unknown,
  );
  TestValidator.equals(
    "product.seller.id matches authenticated member",
    seller1.id,
    member.id,
  );

  // 5) Create second variant under the same product
  const variantCode2 = `variant-${RandomGenerator.alphabets(8)}`;
  const variantInput2 = {
    shopping_mall_product_id: firstProduct.id,
    code: variantCode2,
    title: RandomGenerator.name(),
    option_value: RandomGenerator.alphabets(10),
    price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
    is_active: true,
  } satisfies IShoppingMallProductVariant.ICreate;
  const variant2 =
    await generate_random_shopping_mall_member_product_variants_create(
      memberConnection,
      {
        body: variantInput2,
      },
    );
  typia.assert(variant2);

  TestValidator.equals(
    "variant2.code matches request",
    variant2.code,
    variantCode2,
  );
  TestValidator.equals(
    "variant2.product.id matches product",
    variant2.product.id,
    firstProduct.id,
  );
  TestValidator.equals(
    "variant2.deleted_at is null",
    variant2.deleted_at,
    null,
  );
  const seller2 = typia.assert<{ id: typeof member.id }>(
    variant2.product.seller as unknown,
  );
  TestValidator.equals(
    "variant2.product.seller.id matches authenticated member",
    seller2.id,
    member.id,
  );
  TestValidator.notEquals(
    "variant codes are distinct",
    variant1.code,
    variant2.code,
  );
}
