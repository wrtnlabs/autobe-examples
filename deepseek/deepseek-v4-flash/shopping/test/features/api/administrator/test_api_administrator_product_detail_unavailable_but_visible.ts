import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_administrator_product_detail_unavailable_but_visible(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin #1 joins (context setup)
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1Email = typia.random<string & tags.Format<"email">>();
  const admin1Password = RandomGenerator.alphaNumeric(16);
  const admin1Result = await authorize_administrator_join(admin1Connection, {
    body: {
      email: admin1Email,
      password: admin1Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin1Result);
  // Step 2: Seller joins the platform
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const shopName = RandomGenerator.name();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: shopName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  // Step 3: Seller login for actor context switching
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSeller.ILogin,
  });
  // Step 4: Seller creates a product without any variants
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: null,
      },
    },
  );
  typia.assert(product);
  // Step 5: Admin #2 joins to query the product
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const admin2Password = RandomGenerator.alphaNumeric(16);
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Result = await authorize_administrator_join(admin2Connection, {
    body: {
      email: admin2Email,
      password: admin2Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin2Result);
  // Step 6: Admin #2 queries the product detail
  const retrieved =
    await api.functional.eCommerceMall.administrator.products.at(
      admin2Connection,
      {
        productId: product.id,
      },
    );
  typia.assert(retrieved);
  // Step 7: Validate unavailable_but_visible state
  TestValidator.equals(
    "visibility is unavailable_but_visible",
    retrieved.visibility,
    "unavailable_but_visible",
  );
  TestValidator.equals("variants is empty", retrieved.variants, []);
  TestValidator.equals("images is empty", retrieved.images, []);
  TestValidator.equals("category is null", retrieved.category, null);
  TestValidator.equals(
    "average_rating is null",
    retrieved.average_rating,
    null,
  );
  TestValidator.equals("review_count is 0", retrieved.review_count, 0);
  TestValidator.equals("reviews is empty", retrieved.reviews, []);
  TestValidator.equals("product id matches", retrieved.id, product.id);
  TestValidator.equals("product name matches", retrieved.name, product.name);
  TestValidator.equals(
    "product description matches",
    retrieved.description,
    product.description,
  );
  TestValidator.equals(
    "product base_price matches",
    retrieved.base_price,
    product.base_price,
  );
}
