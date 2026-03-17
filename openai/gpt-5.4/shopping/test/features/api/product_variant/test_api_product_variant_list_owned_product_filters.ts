import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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

export async function test_api_product_variant_list_owned_product_filters(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = {
    host: connection.host,
  };
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
          name: RandomGenerator.name(3),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: 12000,
          status: RandomGenerator.pick(["draft", "active", "selling"] as const),
        },
      },
    );
  typia.assert(product);
  const productSnapshot = {
    id: product.id,
    name: product.name,
    description: product.description,
    base_price: product.base_price,
    status: product.status,
    created_at: product.created_at,
    updated_at: product.updated_at,
    deleted_at: product.deleted_at,
  };
  const variantBodies = [
    {
      sku_code: `sku-${RandomGenerator.alphaNumeric(8)}-alpha`,
      option_summary: `Color ${RandomGenerator.alphabets(5)} / Size M`,
      price: null,
    },
    {
      sku_code: `sku-${RandomGenerator.alphaNumeric(8)}-beta`,
      option_summary: `Color ${RandomGenerator.alphabets(5)} / Size L`,
      price: 15000,
    },
    {
      sku_code: `sku-${RandomGenerator.alphaNumeric(8)}-gamma`,
      option_summary: `Material ${RandomGenerator.alphabets(5)} / Fit Slim`,
      price: 18000,
    },
  ] satisfies IShoppingMallProductVariant.ICreate[];
  const createdVariants = await ArrayUtil.asyncMap(
    variantBodies,
    async (body) => {
      const created =
        await generate_random_shopping_mall_seller_seller_products_variants_create(
          sellerConnection,
          {
            params: {
              productId: product.id,
            },
            body,
          },
        );
      typia.assert(created);
      return created;
    },
  );
  const variantSnapshots = createdVariants.map((variant) => ({
    id: variant.id,
    sku_code: variant.sku_code,
    option_summary: variant.option_summary,
    price: variant.price,
    created_at: variant.created_at,
    updated_at: variant.updated_at,
    deleted_at: variant.deleted_at,
    product_id: variant.product.id,
  }));
  const targetVariant = createdVariants[1]!;
  const searchTerm = targetVariant.sku_code;
  const request = {
    search: searchTerm,
    sort: "createdAt",
    direction: "asc",
    page: 1,
    limit: 10,
  } satisfies IShoppingMallProductVariant.IRequest;
  const page =
    await api.functional.shoppingMall.seller.seller_products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: request,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "pagination current page",
    page.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit",
    page.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "records cover returned rows",
    page.pagination.records >= page.data.length,
  );
  TestValidator.predicate("pages non-negative", page.pagination.pages >= 0);
  TestValidator.predicate(
    "returned rows within limit",
    page.data.length <= request.limit,
  );
  TestValidator.predicate(
    "target variant included in search results",
    page.data.some((row) => row.id === targetVariant.id),
  );
  const createdVariantIds = createdVariants.map((variant) => variant.id);
  for (const row of page.data) {
    TestValidator.predicate(
      "row belongs to created variants of owned product",
      createdVariantIds.includes(row.id),
    );
    TestValidator.predicate(
      "row matches search against sku or option summary",
      row.sku_code.includes(searchTerm) ||
        row.option_summary.includes(searchTerm),
    );
    TestValidator.predicate(
      "summary does not expose nested product field",
      !Object.prototype.hasOwnProperty.call(row, "product"),
    );
    const matched = createdVariants.find((variant) => variant.id === row.id);
    TestValidator.predicate(
      "matched created variant exists",
      matched !== undefined,
    );
    TestValidator.equals(
      "summary sku preserved",
      row.sku_code,
      matched!.sku_code,
    );
    TestValidator.equals(
      "summary option summary preserved",
      row.option_summary,
      matched!.option_summary,
    );
    TestValidator.equals("summary price preserved", row.price, matched!.price);
    TestValidator.equals(
      "summary created_at preserved",
      row.created_at,
      matched!.created_at,
    );
    TestValidator.equals(
      "summary updated_at preserved",
      row.updated_at,
      matched!.updated_at,
    );
    TestValidator.equals(
      "summary deleted_at preserved",
      row.deleted_at,
      matched!.deleted_at,
    );
    TestValidator.equals(
      "newly created variants are active",
      row.deleted_at,
      null,
    );
  }
  for (let i = 1; i < page.data.length; ++i) {
    TestValidator.predicate(
      "rows sorted by created_at ascending",
      page.data[i - 1]!.created_at <= page.data[i]!.created_at,
    );
  }
  TestValidator.equals(
    "product id unchanged locally",
    product.id,
    productSnapshot.id,
  );
  TestValidator.equals(
    "product name unchanged locally",
    product.name,
    productSnapshot.name,
  );
  TestValidator.equals(
    "product description unchanged locally",
    product.description,
    productSnapshot.description,
  );
  TestValidator.equals(
    "product base_price unchanged locally",
    product.base_price,
    productSnapshot.base_price,
  );
  TestValidator.equals(
    "product status unchanged locally",
    product.status,
    productSnapshot.status,
  );
  TestValidator.equals(
    "product created_at unchanged locally",
    product.created_at,
    productSnapshot.created_at,
  );
  TestValidator.equals(
    "product updated_at unchanged locally",
    product.updated_at,
    productSnapshot.updated_at,
  );
  TestValidator.equals(
    "product deleted_at unchanged locally",
    product.deleted_at,
    productSnapshot.deleted_at,
  );
  for (const snapshot of variantSnapshots) {
    const variant = createdVariants.find((elem) => elem.id === snapshot.id);
    TestValidator.predicate(
      "variant snapshot target exists",
      variant !== undefined,
    );
    TestValidator.equals(
      "variant sku unchanged locally",
      variant!.sku_code,
      snapshot.sku_code,
    );
    TestValidator.equals(
      "variant option summary unchanged locally",
      variant!.option_summary,
      snapshot.option_summary,
    );
    TestValidator.equals(
      "variant price unchanged locally",
      variant!.price,
      snapshot.price,
    );
    TestValidator.equals(
      "variant created_at unchanged locally",
      variant!.created_at,
      snapshot.created_at,
    );
    TestValidator.equals(
      "variant updated_at unchanged locally",
      variant!.updated_at,
      snapshot.updated_at,
    );
    TestValidator.equals(
      "variant deleted_at unchanged locally",
      variant!.deleted_at,
      snapshot.deleted_at,
    );
    TestValidator.equals(
      "variant product remains scoped to owned product",
      variant!.product.id,
      snapshot.product_id,
    );
  }
}
