import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCommentAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAnalytic";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_comment_analytics_query(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Step 1: Register and authenticate super admin
  await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  // Step 2: Submit comment analytics query
  const analyticsResult =
    await api.functional.discussionBoard.superAdmin.analytics.comments.submitCommentAnalytics(
      superAdminConnection,
      {
        body: typia.random<IDiscussionBoardCommentAnalytic.IRequest>(),
      },
    );
  // Step 3: Validate response structure
  typia.assert(analyticsResult);
}
