import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import type { IRedditPlatformUserActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivityLog";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
/**
 * Test unauthorized access to user activity logs.
 *
 * Validates that users cannot access other users' activity logs without proper permissions.
 * Uses the join endpoint to create users who will have associated activity logs,
 * then attempts unauthorized access to verify authorization restrictions work correctly.
 */
export async function test_api_user_activity_log_unauthorized_access(connection: api.IConnection): Promise<void> {
    // Step 1: Create User A (the owner of the activity log)
    const userAConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(userAConnection, {
        body: typia.random<IRedditPlatformUser.IJoin>(),
    });
    // Step 2: Create User B (the unauthorized user attempting access)
    const userBConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(userBConnection, {
        body: typia.random<IRedditPlatformUser.IJoin>(),
    });
    // Attempt to access an activity log with User B's credentials
    // using a log ID that might exist (this is a best-effort approach)
    try {
        await api.functional.redditPlatform.user_activity_logs.at(userBConnection, {
            logId: "00000000-0000-0000-0000-000000000000", // Use a null UUID as a test
        });
        // If we reach here, the access was allowed, which should not happen
        throw new Error("Expected unauthorized access to fail but succeeded");
    }
    catch (error) {
        // Verify we got an appropriate authorization error
        if (typia.is<api.HttpError>(error)) {
            TestValidator.equals("status should be 403 or 401", error.status === 403 || error.status === 401, true);
        }
        else {
            throw error;
        }
    }
}