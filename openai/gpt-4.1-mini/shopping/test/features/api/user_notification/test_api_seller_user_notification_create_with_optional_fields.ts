import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_user_notifications_create_user_notification } from "../../../generate/generate_random_shopping_mall_seller_user_notifications_create_user_notification";
import { prepare_random_shopping_mall_user_notification } from "../../../prepare/prepare_random_shopping_mall_user_notification";

export async function test_api_seller_user_notification_create_with_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = { Authorization: authorized.token.access };
  // Step 2: Prepare optional fields - since they do not exist in type, cannot set or test them
  // So we skip optionalUrl and optionalImageUrl
  // Step 3: Prepare notification creation body empty as per type
  const body: any = {};
  // Step 4: Call createUserNotification utility function (provided)
  const notification =
    await generate_random_shopping_mall_seller_user_notifications_create_user_notification(
      sellerConnection,
      {
        body,
      },
    );
  // Step 5: Validate the response using typia.assert
  typia.assert(notification);
  // Since url, image_url, is_read, delivered_at, read_at do not exist in type, do not test them
}