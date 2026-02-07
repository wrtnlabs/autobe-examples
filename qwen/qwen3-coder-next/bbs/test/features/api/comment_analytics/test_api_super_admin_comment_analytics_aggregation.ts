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

export async function test_api_super_admin_comment_analytics_aggregation(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  typia.assert(authResult);
  // Submit analytics query with empty request body
  const analyticsQuery: IDiscussionBoardCommentAnalytic.IRequest = {};
  const analyticsResponse =
    await api.functional.discussionBoard.superAdmin.analytics.comments.submitCommentAnalytics(
      superAdminConnection,
      {
        body: analyticsQuery,
      },
    );
  // Validate response structure
  typia.assert(analyticsResponse);
}
