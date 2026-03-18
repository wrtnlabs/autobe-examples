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
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_variant_create_conflict_duplicate_code_within_product(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as seller-capable member
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const member: IShoppingMallMember.IAuthorized = await authorize_member_join(
    memberJoinConnection,
    {},
  );
  typia.assert(member);

  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = member.token.access;

  const shoppingMallAny = api.functional.shoppingMall as any;

  // 2) Create seller-owned product
  const categoryRaw = await shoppingMallAny.products.categories.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        slug: RandomGenerator.alphabets(10),
        visibility: "public",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100000>
        >(),
      },
    },
  );
  const category = typia.assert<IShoppingMallCategory.ISummary>(categoryRaw);

  const productRaw = await shoppingMallAny.member.products.create(memberConnection, {
    body: {
      code: RandomGenerator.alphabets(12),
      name: RandomGenerator.name(),
      description: RandomGenerator.paragraph({ sentences: 3 }),
      is_featured: true,
      shopping_mall_category_id: category.id,
    },
  });
  const product = typia.assert<IShoppingMallProduct.ISummary>(productRaw);

  // 3) Create first variant with code C1
  const codeC1 = `code_${RandomGenerator.alphabets(10)}`;
  const firstVariantInput: IShoppingMallProductVariant.ICreate = {
    shopping_mall_product_id: product.id,
    code: codeC1,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    option_value: RandomGenerator.alphabets(8),
    price: typia.random<number & tags.Type<"float"> & tags.Minimum<1>>(),
    is_active: true,
  };

  const firstVariant = await generate_random_shopping_mall_member_product_variants_create(
    memberConnection,
    {
      body: firstVariantInput,
    },
  );
  typia.assert(firstVariant);

  // 4) Attempt duplicate create with same product and code, different fields
  const secondVariantInput: IShoppingMallProductVariant.ICreate = {
    shopping_mall_product_id: product.id,
    code: codeC1,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    option_value: RandomGenerator.alphabets(8),
    price:
      firstVariantInput.price +
      typia.random<number & tags.Type<"float"> & tags.Minimum<1>>(),
    is_active: false,
  };

  await TestValidator.error(
    "duplicate variant code within the same product should be rejected",
    async () => {
      await shoppingMallAny.member.productVariants.create(memberConnection, {
        body: secondVariantInput,
      });
    },
  );

  // Verify exactly one variant with codeC1 exists and it wasn't overwritten.
  const variantsAfterRaw = await shoppingMallAny.member.productVariants.list(
    memberConnection,
    {
      query: {
        shopping_mall_product_id: product.id,
      },
    },
  );

  const variantsAfter = typia.assert<IShoppingMallProductVariant[]>(variantsAfterRaw);
  const variantsWithCode = variantsAfter.filter((v) => v.code === codeC1);

  TestValidator.equals(
    "should have exactly one variant with duplicate code",
    variantsWithCode.length,
    1,
  );

  const remaining = variantsWithCode[0];
  TestValidator.equals("variant id unchanged", remaining.id, firstVariant.id);
  TestValidator.equals("title unchanged", remaining.title, firstVariant.title);
  TestValidator.equals(
    "option_value unchanged",
    remaining.option_value,
    firstVariant.option_value,
  );
  TestValidator.equals("price unchanged", remaining.price, firstVariant.price);
  TestValidator.equals(
    "is_active unchanged",
    remaining.is_active,
    firstVariant.is_active,
  );
}
