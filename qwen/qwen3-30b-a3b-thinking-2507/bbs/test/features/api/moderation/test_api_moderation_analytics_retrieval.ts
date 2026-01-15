import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_moderation_analytics_retrieval(connection: api.IConnection): Promise<void> {
    // Create a new connection for admin authentication
    const adminConnection: api.IConnection = { host: connection.host };
    // Generate random admin credentials
    const adminEmail = typia.random<string & tags.Format<"email">>();
    const adminPassword = typia.random<string & tags.MinLength<8> & tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}">>();
    // Register as new admin and authenticate
    const admin = await authorize_admin_join(adminConnection, {
        body: {
            email: adminEmail,
            password: adminPassword,
        },
    });
    // Retrieve moderation analytics as admin
    const analytics = await api.functional.discussionBoard.admin.analytics.moderation.actions.index(adminConnection);
    // Validate analytics response
    typia.assert(analytics);
    // Verify analytics structure
    TestValidator.predicate("analytics response should have pagination info", !!analytics.pagination);
    TestValidator.predicate("analytics response should have data", !!analytics.data && Array.isArray(analytics.data));
    // Verify data items have expected structure
    TestValidator.predicate("all moderation actions should have required properties", analytics.data.every(item => item.id &&
        ['approve', 'reject', 'archive'].includes(item.actionType) &&
        item.createdAt &&
        item.article));
}