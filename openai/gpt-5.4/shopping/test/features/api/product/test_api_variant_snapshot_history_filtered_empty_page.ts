import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_variant_snapshot_history_filtered_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const createdProduct: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: 100,
          status: "active",
          shopping_mall_category_id: null,
        },
      },
    );
  typia.assert(createdProduct);
  const fixtureProductId: string | undefined =
    process.env.SHOPPING_MALL_VARIANT_SNAPSHOT_FIXTURE_PRODUCT_ID;
  const fixtureSnapshotId: string | undefined =
    process.env.SHOPPING_MALL_VARIANT_SNAPSHOT_FIXTURE_PRODUCT_SNAPSHOT_ID;
  TestValidator.predicate(
    "fixture product id is provided",
    fixtureProductId !== undefined && fixtureProductId.length > 0,
  );
  TestValidator.predicate(
    "fixture product snapshot id is provided",
    fixtureSnapshotId !== undefined && fixtureSnapshotId.length > 0,
  );
  const productId = typia.assert<string & tags.Format<"uuid">>(
    fixtureProductId,
  );
  const productSnapshotId = typia.assert<string & tags.Format<"uuid">>(
    fixtureSnapshotId,
  );
  const body = {
    change_summary: `__no_match__${RandomGenerator.alphaNumeric(16)}`,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallProductVariantSnapshot.IRequest;
  const page: IPageIShoppingMallProductVariantSnapshot =
    await api.functional.shoppingMall.seller.products.snapshots.variant_snapshots.index(
      sellerConnection,
      {
        productId,
        productSnapshotId,
        body,
      },
    );
  typia.assert(page);
  TestValidator.equals("filtered result is empty", page.data.length, 0);
  TestValidator.equals(
    "pagination current page preserved",
    page.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit preserved", page.pagination.limit, 10);
  TestValidator.equals(
    "pagination record count is zero",
    page.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination page count is zero",
    page.pagination.pages,
    0,
  );
}
