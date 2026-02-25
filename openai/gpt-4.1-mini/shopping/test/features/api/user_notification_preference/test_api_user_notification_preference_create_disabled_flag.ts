import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
import { prepare_random_shopping_mall_user_notification_preference } from "../../../prepare/prepare_random_shopping_mall_user_notification_preference";
import { generate_random_shopping_mall_administrator_user_notification_preferences_create } from "../../../generate/generate_random_shopping_mall_administrator_user_notification_preferences_create";
import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
export async function test_api_user_notification_preference_create_disabled_flag(connection: api.IConnection): Promise<void> {
    // Scenario 2: Create a user notification preference with isEnabled = false
    // Authenticate as administrator
    const adminConnection: api.IConnection = { host: connection.host };
    const adminAuth = await authorize_administrator_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "12345678",
        },
    });
    typia.assert(adminAuth);
    // adminConnection.headers must contain Authorization now
    // Prepare preference body with isEnabled false and administratorId set
    const preferenceBody: IShoppingMallUserNotificationPreference.ICreate = {
        channelName: "email",
        notificationType: "system_alert",
        isEnabled: false,
        administratorId: adminAuth.id,
    };
    // Create the user notification preference
    const preference = await generate_random_shopping_mall_administrator_user_notification_preferences_create(adminConnection, { body: preferenceBody });
    typia.assert(preference);
    // Validate created preference
    TestValidator.equals("administratorId matches", preference.administratorId, adminAuth.id);
    TestValidator.equals("isEnabled equals false", preference.isEnabled, false);
    TestValidator.equals("channelName matches", preference.channelName, preferenceBody.channelName);
    TestValidator.equals("notificationType matches", preference.notificationType, preferenceBody.notificationType);
    // Optionally, check createdAt and updatedAt exist and are ISO strings
    TestValidator.predicate("createdAt is ISO string", typeof preference.createdAt === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(preference.createdAt));
    TestValidator.predicate("updatedAt is ISO string", typeof preference.updatedAt === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(preference.updatedAt));
}
