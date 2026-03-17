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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_variant_list_owned_product_empty_result(
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
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
          status: "draft",
        },
      },
    );
  typia.assert(product);
  const requestBody = {
    search: RandomGenerator.alphaNumeric(12),
    skuCode: RandomGenerator.alphaNumeric(10),
    optionSummary: RandomGenerator.paragraph({ sentences: 2 }),
    deletedAt: null,
    page: 1,
    limit: 10,
    sort: "createdAt",
    direction: "asc",
  } satisfies IShoppingMallProductVariant.IRequest;
  const page = await api.functional.shoppingMall.products.variants.index(
    sellerConnection,
    {
      productId: product.id,
      body: requestBody,
    },
  );
  typia.assert(page);
  TestValidator.equals("empty variant list data", page.data.length, 0);
  TestValidator.equals(
    "requested current page preserved",
    page.pagination.current,
    1,
  );
  TestValidator.equals("requested limit preserved", page.pagination.limit, 10);
  TestValidator.equals(
    "empty result has zero records",
    page.pagination.records,
    0,
  );
  TestValidator.equals("empty result has zero pages", page.pagination.pages, 0);
  TestValidator.predicate(
    "empty page has internally consistent pagination",
    page.pagination.records === 0 &&
      page.pagination.pages === 0 &&
      page.pagination.current >= 0 &&
      page.pagination.limit >= 0,
  );
}
