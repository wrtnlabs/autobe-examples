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
import { prepare_random_discussion_board_admin_session } from "../../../prepare/prepare_random_discussion_board_admin_session";
import { generate_random_discussion_board_admin_admins_sessions_create } from "../../../generate/generate_random_discussion_board_admin_admins_sessions_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_session_retrieval(connection: api.IConnection): Promise<void> {
    // 1. Create a new admin user context for session testing
    const adminEmail = typia.random<string & tags.Format<"email">>();
    const admin: IDiscussionBoardAdmin.IAuthorized = await authorize_admin_join({ host: connection.host }, {
        body: {
            email: adminEmail,
            password: "AdminPass123!"
        }
    });
    const adminConnection: api.IConnection = { host: connection.host };
    // 2. Create the session to be retrieved
    const session = await generate_random_discussion_board_admin_admins_sessions_create(adminConnection, {
        body: {
            device_info: "Chrome on macOS",
            ip: "192.168.1.1",
            user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        params: {
            adminId: admin.id
        }
    });
    // 3. Retrieve the session details
    const retrievedSession = await api.functional.discussionBoard.admin.admins.sessions.at(adminConnection, {
        adminId: session.admin.id,
        sessionId: session.id
    });
    // 4. Validate the retrieved session details
    typia.assert(retrievedSession);
    TestValidator.equals("session ID should match", retrievedSession.id, session.id);
    TestValidator.equals("admin ID should match", retrievedSession.admin.id, session.admin.id);
    TestValidator.equals("session status should be active", retrievedSession.status, "active");
    TestValidator.equals("last_activity_at should be a date-time string", typeof retrievedSession.last_activity_at, "string");
    TestValidator.equals("expiration should be a date-time string", typeof retrievedSession.expiration, "string");
}