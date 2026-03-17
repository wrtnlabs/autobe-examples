import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_inventory_history_variant_ledger_review(
  connection: api.IConnection,
): Promise<void> {
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administratorPassword = typia.random<
    string & tags.Format<"password">
  >();
  const administratorHref = typia.random<string & tags.Format<"uri">>();
  const administratorReferrer = typia.random<string & tags.Format<"uri">>();
  const administratorJoinConnection: api.IConnection = {
    host: connection.host,
  };
  const administratorJoined = await authorize_administrator_join(
    administratorJoinConnection,
    {
      body: {
        email: administratorEmail,
        password: administratorPassword,
        href: administratorHref,
        referrer: administratorReferrer,
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(administratorJoined);
  const administratorConnection: api.IConnection = {
    host: connection.host,
  };
  const administratorLoggedIn = await authorize_administrator_login(
    administratorConnection,
    {
      body: {
        email: administratorEmail,
        password: administratorPassword,
        href: administratorHref,
        referrer: administratorReferrer,
      } satisfies IShoppingMallAdministrator.ILogin,
    },
  );
  typia.assert(administratorLoggedIn);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const sellerHref = typia.random<string & tags.Format<"uri">>();
  const sellerReferrer = typia.random<string & tags.Format<"uri">>();
  const sellerJoinConnection: api.IConnection = {
    host: connection.host,
  };
  const sellerJoined = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sellerHref,
      referrer: sellerReferrer,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoined);
  const sellerConnection: api.IConnection = {
    host: connection.host,
  };
  const sellerLoggedIn = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sellerHref,
      referrer: sellerReferrer,
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLoggedIn);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(2),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
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
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >() satisfies number as number,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const page =
    await api.functional.shoppingMall.administrator.products.variants.inventory_records.index(
      administratorConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 100,
          sort: "occurred_at_desc",
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "pagination current page is non-negative",
    page.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit covers current data length",
    page.pagination.limit >= page.data.length,
  );
  TestValidator.predicate(
    "pagination record count covers current data length",
    page.pagination.records >= page.data.length,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page.pagination.pages >= 0,
  );
  for (const record of page.data) {
    TestValidator.equals(
      "ledger record stays scoped to requested variant",
      record.productVariant.id,
      variant.id,
    );
    TestValidator.equals(
      "ledger record variant sku matches requested variant",
      record.productVariant.sku_code,
      variant.sku_code,
    );
    TestValidator.equals(
      "ledger record option summary matches requested variant",
      record.productVariant.option_summary,
      variant.option_summary,
    );
  }
  for (let i = 1; i < page.data.length; ++i) {
    TestValidator.predicate(
      "ledger records are ordered by newest occurred_at first",
      new Date(page.data[i - 1].occurred_at).getTime() >=
        new Date(page.data[i].occurred_at).getTime(),
    );
  }
}
