import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminSession";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_session_history_retrieval(connection: api.IConnection): Promise<void> {
    // Step 1: Register and authenticate as admin
    const adminConnection: api.IConnection = { host: connection.host };
    const adminAuthorized = await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(),
        } satisfies IDiscussionBoardAdmin.IJoin,
    });
    typia.assert(adminAuthorized);
    // Step 2: Retrieve session history (this should work with admin auth)
    const sessionHistory = await api.functional.discussionBoard.admin.sessions.index(adminConnection);
    typia.assert(sessionHistory);
    // Step 3: Validate response structure
    TestValidator.predicate("has pagination", sessionHistory.pagination !== undefined);
    TestValidator.predicate("has data array", Array.isArray(sessionHistory.data));
    // Step 4: Validate pagination structure
    TestValidator.predicate("pagination has current", sessionHistory.pagination.current > 0);
    TestValidator.predicate("pagination has limit", sessionHistory.pagination.limit > 0);
    TestValidator.predicate("pagination has records", sessionHistory.pagination.records >= 0);
    TestValidator.predicate("pagination has pages", sessionHistory.pagination.pages >= 0);
    // Step 5: Validate session data if exists
    if (sessionHistory.data.length > 0) {
        const firstSession = sessionHistory.data[0];
        typia.assert(firstSession);
        // Validate session properties
        TestValidator.predicate("session has id", firstSession.id !== undefined);
        TestValidator.predicate("session has ip", firstSession.ip !== undefined);
        TestValidator.predicate("session has href", firstSession.href !== undefined);
        TestValidator.predicate("session has created_at", firstSession.created_at !== undefined);
        TestValidator.predicate("session has expired_at", firstSession.expired_at !== undefined);
        TestValidator.predicate("session has admin", firstSession.admin !== undefined);
        // Validate admin summary properties
        if (firstSession.admin) {
            TestValidator.predicate("admin has id", firstSession.admin.id !== undefined);
            TestValidator.predicate("admin has display_name", firstSession.admin.display_name !== undefined);
            TestValidator.predicate("admin has email", firstSession.admin.email !== undefined);
        }
        // Validate IP format (ipv4)
        TestValidator.predicate("ip format", /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/.test(firstSession.ip));
        // Validate timestamp formats
        TestValidator.predicate("created_at format", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(firstSession.created_at));
    }
}