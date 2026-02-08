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

export async function test_api_seller_user_notification_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and obtains authorized connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(connection, {
    body: {},
  });
  sellerConnection.headers = { Authorization: sellerAuthorized.token.access };
  // 2. Prepare user notification creation request body
  // - notification_template_id: valid UUID
  // - owner_id: valid UUID
  // - owner_type: must be one of 'customer', 'seller', 'administrator'
  // - title and body: non-empty strings
  // - url and image_url: optional; include for completeness
  // Generate UUID values using typia.random
  const notificationTemplateId = typia.random<string & tags.Format<"uuid">>();
  const ownerId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    notification_template_id: notificationTemplateId,
    owner_id: ownerId,
    owner_type: "customer" as const,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.paragraph({ sentences: 3 }),
    url: `https://example.com/${RandomGenerator.alphabets(10)}`,
    image_url: `https://example.com/images/${RandomGenerator.alphabets(5)}.png`,
  } satisfies IShoppingMallUserNotification.ICreate;
  // 3. Call generate_random_shopping_mall_seller_user_notifications_create_user_notification utility
  const notification =
    await generate_random_shopping_mall_seller_user_notifications_create_user_notification(
      sellerConnection,
      { body },
    );
  // Cast notification to the type that includes required properties
  const assertedNotification = typia.assert<
    (typeof notification) & {
      is_read: boolean;
      delivered_at: string | null;
      read_at: string | null;
      notification_template_id: string & tags.Format<"uuid">;
      owner_id: string & tags.Format<"uuid">;
      owner_type: "customer" | "seller" | "administrator";
      title: string;
      body: string;
      url: string | null;
      image_url: string | null;
    }
  >(notification);
  // 4. Validate notification fields
  TestValidator.equals("is_read should be false", assertedNotification.is_read, false);
  TestValidator.equals(
    "delivered_at should be null",
    assertedNotification.delivered_at,
    null,
  );
  TestValidator.equals("read_at should be null", assertedNotification.read_at, null);
  TestValidator.equals(
    "notification_template_id matches",
    assertedNotification.notification_template_id,
    body.notification_template_id,
  );
  TestValidator.equals(
    "owner_id matches",
    assertedNotification.owner_id,
    body.owner_id,
  );
  TestValidator.equals(
    "owner_type matches",
    assertedNotification.owner_type,
    body.owner_type,
  );
  TestValidator.equals("title matches", assertedNotification.title, body.title);
  TestValidator.equals("body matches", assertedNotification.body, body.body);
  TestValidator.equals("url matches", assertedNotification.url, body.url);
  TestValidator.equals(
    "image_url matches",
    assertedNotification.image_url,
    body.image_url,
  );
}
