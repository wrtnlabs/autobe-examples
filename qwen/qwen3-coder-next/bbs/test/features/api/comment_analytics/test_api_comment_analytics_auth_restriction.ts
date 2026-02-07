import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardCommentAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAnalytic";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_comment_analytics_auth_restriction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for unauthorized testing
  const memberConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.member.join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  typia.assert(memberConnection);
  // 2. Attempt to access analytics as unauthorized member - should fail
  await TestValidator.error("unauthorized access to analytics", async () => {
    await api.functional.discussionBoard.admin.analytics.comments.submitCommentAnalytics(
      memberConnection,
      {
        body: typia.random<IDiscussionBoardCommentAnalytic.IRequest>(),
      },
    );
  });
  // 3. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.admin.join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  typia.assert(adminConnection);
  // 4. Login as admin to get proper authentication
  await api.functional.discussionBoard.auth.admin.login(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.ILogin>(),
  });
  typia.assert(adminConnection);
  // 5. Verify admin can successfully access analytics
  const analytics =
    await api.functional.discussionBoard.admin.analytics.comments.submitCommentAnalytics(
      adminConnection,
      {
        body: typia.random<IDiscussionBoardCommentAnalytic.IRequest>(),
      },
    );
  typia.assert(analytics);
}
