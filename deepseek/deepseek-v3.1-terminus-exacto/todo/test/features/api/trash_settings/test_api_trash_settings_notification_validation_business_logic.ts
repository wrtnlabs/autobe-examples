import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTrashSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashSetting";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

async function local_authorize_user_join(connection: api.IConnection, props: {
    body?: Partial<ITodoAppUser.IJoin>;
}): Promise<ITodoAppUser.IAuthorized> {
    const joinInput = {
        email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
        password: props.body?.password ?? "password123",
        display_name: props.body?.display_name ?? "Test User",
        href: props.body?.href ?? "http://localhost:3000",
        referrer: props.body?.referrer ?? "http://localhost:3000",
    } satisfies ITodoAppUser.IJoin;
    return await api.functional.todoApp.auth.user.join(connection, {
        body: joinInput,
    });
}

export async function test_api_trash_settings_notification_validation_business_logic(connection: api.IConnection): Promise<void> {
    // Register and authenticate a user using utility function
    const userConnection: api.IConnection = { host: connection.host };
    const auth = await local_authorize_user_join(userConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "password123",
            display_name: "Test User",
            href: "http://localhost:3000",
            referrer: "http://localhost:3000",
        },
    });
    typia.assert(auth);
    // Update userConnection with authentication token
    userConnection.headers = { Authorization: `Bearer ${auth.token.access}` };
    // Test scenario 1: notify_days_before equal to retention_period_days (should fail)
    await TestValidator.error("equal values should fail business validation", async () => {
        await api.functional.todoApp.user.trash_settings.update(userConnection, {
            body: {
                retention_period_days: 30 satisfies number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<365>,
                notify_before_cleanup: true,
                notify_days_before: 30 satisfies number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<364>,
            } satisfies ITodoAppTrashSetting.IUpdate,
        });
    });
    // Test scenario 2: notify_days_before greater than retention_period_days (should fail)
    await TestValidator.error("greater value should fail business validation", async () => {
        await api.functional.todoApp.user.trash_settings.update(userConnection, {
            body: {
                retention_period_days: 30 satisfies number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<365>,
                notify_before_cleanup: true,
                notify_days_before: 31 satisfies number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<364>,
            } satisfies ITodoAppTrashSetting.IUpdate,
        });
    });
    // Test scenario 3: notify_days_before less than retention_period_days (should succeed)
    const validSettings = await api.functional.todoApp.user.trash_settings.update(userConnection, {
        body: {
            retention_period_days: 30 satisfies number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<365>,
            notify_before_cleanup: true,
            notify_days_before: 29 satisfies number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<364>,
        } satisfies ITodoAppTrashSetting.IUpdate,
    });
    typia.assert(validSettings);
    // Test scenario 4: notifications disabled with any notify_days_before value (should succeed)
    const disabledNotifications = await api.functional.todoApp.user.trash_settings.update(userConnection, {
        body: {
            notify_before_cleanup: false,
            notify_days_before: 50 satisfies number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<364>,
        } satisfies ITodoAppTrashSetting.IUpdate,
    });
    typia.assert(disabledNotifications);
}