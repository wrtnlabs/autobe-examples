import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
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

export async function test_api_inventory_record_filter_and_pagination_for_owned_variant(
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
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >() satisfies number as number,
          status: "active",
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: `sku-${RandomGenerator.alphaNumeric(8)}`,
          option_summary: RandomGenerator.paragraph({ sentences: 3 }),
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<100>
          >() satisfies number as number,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const occurredFrom = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  const occurredTo = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  const request = {
    reason: RandomGenerator.alphaNumeric(12),
    occurred_from: occurredFrom,
    occurred_to: occurredTo,
    sort: "occurred_at_desc",
    page: 1,
    limit: 10,
  } satisfies IShoppingMallInventoryRecord.IRequest;
  const occurredFromTime = new Date(request.occurred_from).getTime();
  const occurredToTime = new Date(request.occurred_to).getTime();
  const page =
    await api.functional.shoppingMall.seller.seller_products.variants.inventory_records.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
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
    "pagination records non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages consistency",
    page.pagination.pages,
    page.pagination.records === 0
      ? 0
      : Math.ceil(page.pagination.records / page.pagination.limit),
  );
  TestValidator.predicate(
    "returned data respects limit",
    page.data.length <= page.pagination.limit,
  );
  TestValidator.equals(
    "page 1 slice length matches metadata",
    page.data.length,
    Math.min(page.pagination.records, page.pagination.limit),
  );
  if (page.pagination.records === 0) {
    TestValidator.equals(
      "zero records returns empty data",
      page.data.length,
      0,
    );
  }
  for (const record of page.data) {
    TestValidator.equals(
      "record variant matches requested variant",
      record.productVariant.id,
      variant.id,
    );
    TestValidator.equals(
      "record reason matches filter",
      record.reason,
      request.reason,
    );
    TestValidator.predicate(
      "record occurred_at within lower bound",
      new Date(record.occurred_at).getTime() >= occurredFromTime,
    );
    TestValidator.predicate(
      "record occurred_at within upper bound",
      new Date(record.occurred_at).getTime() <= occurredToTime,
    );
  }
  for (let i = 1; i < page.data.length; ++i) {
    const previous = page.data[i - 1];
    const current = page.data[i];
    TestValidator.predicate(
      "records ordered by occurred_at descending",
      new Date(previous.occurred_at).getTime() >=
        new Date(current.occurred_at).getTime(),
    );
  }
}
