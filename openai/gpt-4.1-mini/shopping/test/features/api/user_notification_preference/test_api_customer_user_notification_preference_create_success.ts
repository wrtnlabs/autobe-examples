import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_user_notification_preferences_create } from "../../../generate/generate_random_shopping_mall_customer_user_notification_preferences_create";
import { prepare_random_shopping_mall_user_notification_preference } from "../../../prepare/prepare_random_shopping_mall_user_notification_preference";

export async function test_api_customer_user_notification_preference_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a customer via join operation
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  // Inject access token into the connection headers
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Generate a random user notification preference creation payload and create it
  const createdPreference =
    await generate_random_shopping_mall_customer_user_notification_preferences_create(
      customerConnection,
      { body: {} },
    );
  typia.assert(createdPreference);
  // 3. Assert the created preference contains required fields
  TestValidator.predicate(
    "created preference has a valid UUID",
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      createdPreference.id,
    ),
  );
  TestValidator.predicate(
    "created preference has channelName",
    typeof createdPreference.channelName === "string" &&
      createdPreference.channelName.length > 0,
  );
  TestValidator.predicate(
    "created preference has notificationType",
    typeof createdPreference.notificationType === "string" &&
      createdPreference.notificationType.length > 0,
  );
  TestValidator.predicate(
    "created preference has isEnabled boolean",
    typeof createdPreference.isEnabled === "boolean",
  );
  TestValidator.predicate(
    "created preference has createdAt date-time",
    typeof createdPreference.createdAt === "string" &&
      createdPreference.createdAt.length > 0,
  );
  TestValidator.predicate(
    "created preference has updatedAt date-time",
    typeof createdPreference.updatedAt === "string" &&
      createdPreference.updatedAt.length > 0,
  );
  // 4. Attempt to create preference without authentication header and expect an error
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "creation fails without authentication",
    async () =>
      await generate_random_shopping_mall_customer_user_notification_preferences_create(
        anonymousConnection,
        { body: {} },
      ),
  );
}
