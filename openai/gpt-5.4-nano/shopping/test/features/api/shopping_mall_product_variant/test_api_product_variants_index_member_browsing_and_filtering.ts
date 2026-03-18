import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
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

export async function test_api_product_variants_index_member_browsing_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member setup (use utility join to satisfy auth contract)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  };
  await authorize_member_join(memberConnection, memberJoin);
  // 2) Create a product under the member
  const product =
    await generate_random_shopping_mall_member_products_create_product(
      memberConnection,
      {},
    );
  typia.assert(product);
  // 3) Create variants with deterministic attributes
  const variants = await Promise.all([
    generate_random_shopping_mall_member_product_variants_create(
      memberConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          code: `SKU-${RandomGenerator.alphabets(6)}`,
          title: `Title-${RandomGenerator.alphabets(6)}`,
          option_value: "Option-Red",
          price: 1200,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    ),
    generate_random_shopping_mall_member_product_variants_create(
      memberConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          code: `SKU-${RandomGenerator.alphabets(6)}`,
          title: `Title-${RandomGenerator.alphabets(6)}`,
          option_value: "Option-Blue",
          price: 800,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    ),
  ]);
  variants.forEach((v) => typia.assert(v));
  const [variantA, variantB] = variants;
  // 4) Scenario 1: scoped listing
  const indexResult1: IPageIShoppingMallProductVariant.ISummary =
    await api.functional.shoppingMall.member.productVariants.index(
      memberConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "asc",
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(indexResult1);
  const expectedPages1 =
    indexResult1.pagination.records === 0
      ? 0
      : Math.ceil(
          indexResult1.pagination.records / indexResult1.pagination.limit,
        );
  TestValidator.equals(
    "pagination.pages coherence",
    indexResult1.pagination.pages,
    expectedPages1,
  );
  for (const item of indexResult1.data) {
    TestValidator.equals("product scope matches", item.product.id, product.id);
  }
  // 5) Scenario 2: substring filtering + sorting
  const codeSubstring = variantA.code.substring(0, 4);
  const indexResult2: IPageIShoppingMallProductVariant.ISummary =
    await api.functional.shoppingMall.member.productVariants.index(
      memberConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          code: codeSubstring,
          page: 1,
          limit: 10,
          sort: "code",
          order: "asc",
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(indexResult2);
  for (const item of indexResult2.data) {
    TestValidator.predicate(
      "code substring match",
      item.code.toLowerCase().includes(codeSubstring.toLowerCase()),
    );
    TestValidator.equals("scoped product", item.product.id, product.id);
  }
  // Sorting check: asc by code
  const codes = indexResult2.data.map((x) => x.code);
  for (let i = 1; i < codes.length; i++) {
    TestValidator.predicate(
      "codes sorted asc",
      codes[i - 1].localeCompare(codes[i]) <= 0,
    );
  }
  // 6) Scenario 3: delete one variant and ensure it is excluded
  await api.functional.shoppingMall.member.productVariants.erase(
    memberConnection,
    { productVariantId: variantB.id },
  );
  const indexResult3: IPageIShoppingMallProductVariant.ISummary =
    await api.functional.shoppingMall.member.productVariants.index(
      memberConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          page: 1,
          limit: 50,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(indexResult3);
  for (const item of indexResult3.data) {
    TestValidator.equals(
      "scoped product after delete",
      item.product.id,
      product.id,
    );
  }
  const deletedPresent = ArrayUtil.has(
    indexResult3.data,
    (x) => x.id === variantB.id,
  );
  TestValidator.equals("deleted variant excluded", deletedPresent, false);
}
