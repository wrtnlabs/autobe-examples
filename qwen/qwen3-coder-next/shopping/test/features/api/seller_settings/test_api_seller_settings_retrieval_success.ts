import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import type { IShoppingMallSellerSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_settings_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: null,
  } satisfies IShoppingMallSeller.IJoin;
  const authorized = await authorize_seller_join(sellerConnection, {
    body: sellerData,
  });
  typia.assert(authorized);
  // 2. Verify seller settings retrieval
  const settings = await api.functional.shoppingMall.sellers.settings.at(
    sellerConnection,
    {
      sellerId: authorized.data.profile.id,
    },
  );
  typia.assert(settings);
  // 3. Validate required fields
  TestValidator.predicate(
    "theme_mode exists",
    typeof settings.theme_mode === "string",
  );
  TestValidator.predicate(
    "font_family exists",
    typeof settings.font_family === "string",
  );
  TestValidator.predicate(
    "products_per_page is number",
    typeof settings.products_per_page === "number",
  );
  TestValidator.predicate(
    "show_reviews is boolean",
    typeof settings.show_reviews === "boolean",
  );
  TestValidator.predicate(
    "show_wishlist is boolean",
    typeof settings.show_wishlist === "boolean",
  );
  TestValidator.predicate(
    "show_comparison is boolean",
    typeof settings.show_comparison === "boolean",
  );
  TestValidator.predicate(
    "show_stock_quantity is boolean",
    typeof settings.show_stock_quantity === "boolean",
  );
  TestValidator.predicate(
    "show_sold_out is boolean",
    typeof settings.show_sold_out === "boolean",
  );
  TestValidator.predicate(
    "show_discounts is boolean",
    typeof settings.show_discounts === "boolean",
  );
  TestValidator.predicate(
    "enable_live_chat is boolean",
    typeof settings.enable_live_chat === "boolean",
  );
  TestValidator.predicate(
    "default_shipping_fee is number",
    typeof settings.default_shipping_fee === "number",
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    typeof settings.updated_at === "string",
  );
}
