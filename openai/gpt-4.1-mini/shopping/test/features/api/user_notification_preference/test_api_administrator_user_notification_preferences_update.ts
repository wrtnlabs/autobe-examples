import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_user_notification_preferences_create } from "../../../generate/generate_random_shopping_mall_administrator_user_notification_preferences_create";
import { prepare_random_shopping_mall_user_notification_preference } from "../../../prepare/prepare_random_shopping_mall_user_notification_preference";

export async function test_api_administrator_user_notification_preferences_update(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful update of an existing user notification preference by authorized admin
  // Setup admin connection and join
  const adminConnection1: api.IConnection = { host: connection.host };
  const adminAuthorized1 = await authorize_administrator_join(
    adminConnection1,
    {},
  );
  // Set auth header
  adminConnection1.headers ??= {};
  adminConnection1.headers.Authorization = adminAuthorized1.token.access;
  // Create a notification preference owned by admin
  const createdPreference =
    await generate_random_shopping_mall_administrator_user_notification_preferences_create(
      adminConnection1,
      {
        body: {
          administratorId: adminAuthorized1.id,
        },
      },
    );
  typia.assert(createdPreference);
  // Prepare update body (updated channelName, notificationType, isEnabled)
  const updateBody: IShoppingMallUserNotificationPreference.IUpdate = {
    channelName: RandomGenerator.alphabets(6),
    notificationType: RandomGenerator.alphabets(6),
    isEnabled: !createdPreference.isEnabled,
  };
  // Perform update
  const updatedPreference =
    await api.functional.shoppingMall.administrator.userNotificationPreferences.update(
      adminConnection1,
      {
        preferenceId: createdPreference.id,
        body: updateBody,
      },
    );
  typia.assert(updatedPreference);
  // Validate updated fields
  TestValidator.equals(
    "updated channelName",
    updatedPreference.channelName,
    updateBody.channelName,
  );
  TestValidator.equals(
    "updated notificationType",
    updatedPreference.notificationType,
    updateBody.notificationType,
  );
  TestValidator.equals(
    "updated isEnabled",
    updatedPreference.isEnabled,
    updateBody.isEnabled,
  );
  TestValidator.equals(
    "administrator owner",
    updatedPreference.administratorId ?? null,
    adminAuthorized1.id,
  );
  // Scenario 2: Unauthorized update attempts
  // Setup second admin connection and join
  const adminConnection2: api.IConnection = { host: connection.host };
  const adminAuthorized2 = await authorize_administrator_join(
    adminConnection2,
    {},
  );
  adminConnection2.headers ??= {};
  adminConnection2.headers.Authorization = adminAuthorized2.token.access;
  // Attempt update as different admin -> expect 403 Forbidden
  await TestValidator.httpError(
    "unauthorized update by different admin",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.userNotificationPreferences.update(
        adminConnection2,
        {
          preferenceId: createdPreference.id,
          body: updateBody,
        },
      );
    },
  );
  // Attempt update with base connection without auth -> expect 403 Forbidden
  await TestValidator.httpError(
    "unauthorized update by anonymous",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.userNotificationPreferences.update(
        connection,
        {
          preferenceId: createdPreference.id,
          body: updateBody,
        },
      );
    },
  );
  // Verify no changes were made
  const afterUnauthorizedAttempt =
    await api.functional.shoppingMall.administrator.userNotificationPreferences.update(
      adminConnection1,
      {
        preferenceId: createdPreference.id,
        body: {
          channelName: updatedPreference.channelName,
          notificationType: updatedPreference.notificationType,
          isEnabled: updatedPreference.isEnabled,
        },
      },
    );
  typia.assert(afterUnauthorizedAttempt);
  TestValidator.equals(
    "preference unchanged after unauthorized updates",
    afterUnauthorizedAttempt,
    updatedPreference,
  );
  // Scenario 3: Update non-existent preference
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "update non-existent preference",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.userNotificationPreferences.update(
        adminConnection1,
        {
          preferenceId: nonExistentId,
          body: updateBody,
        },
      );
    },
  );
}
