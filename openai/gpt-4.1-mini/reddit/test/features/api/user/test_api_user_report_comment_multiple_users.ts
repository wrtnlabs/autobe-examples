import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_comments_create_comment } from "../../../generate/generate_random_community_platform_user_comments_create_comment";
import { generate_random_community_platform_user_reports_comments_report_create_comment_report } from "../../../generate/generate_random_community_platform_user_reports_comments_report_create_comment_report";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_report } from "../../../prepare/prepare_random_community_platform_comment_report";

export async function test_api_user_report_comment_multiple_users(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate first user (user1)
  const user1Connection: api.IConnection = { host: connection.host };
  const user1Auth = await authorize_user_join(user1Connection, {});
  typia.assert(user1Auth);
  // Set auth header for user1Connection
  user1Connection.headers = { Authorization: user1Auth.token.access };
  // Authenticate second user (user2)
  const user2Connection: api.IConnection = { host: connection.host };
  const user2Auth = await authorize_user_join(user2Connection, {});
  typia.assert(user2Auth);
  // Set auth header for user2Connection
  user2Connection.headers = { Authorization: user2Auth.token.access };
  // First user creates a comment
  const commentByUser1 =
    await generate_random_community_platform_user_comments_create_comment(
      user1Connection,
      {},
    );
  typia.assert(commentByUser1);
  // Second user creates a comment
  const commentByUser2 =
    await generate_random_community_platform_user_comments_create_comment(
      user2Connection,
      {},
    );
  typia.assert(commentByUser2);
  // First user reports second user's comment
  const reportByUser1OnUser2Comment =
    await generate_random_community_platform_user_reports_comments_report_create_comment_report(
      user1Connection,
      {
        params: { commentId: commentByUser2.id },
        body: {
          comment_id: commentByUser2.id,
          report_reason_id: null,
          description: null,
        },
      },
    );
  typia.assert(reportByUser1OnUser2Comment);
  // Second user reports first user's comment
  const reportByUser2OnUser1Comment =
    await generate_random_community_platform_user_reports_comments_report_create_comment_report(
      user2Connection,
      {
        params: { commentId: commentByUser1.id },
        body: {
          comment_id: commentByUser1.id,
          report_reason_id: null,
          description: null,
        },
      },
    );
  typia.assert(reportByUser2OnUser1Comment);
  // Validate reports' statuses and references
  TestValidator.equals(
    "First report status",
    reportByUser1OnUser2Comment.status,
    "pending",
  );
  TestValidator.equals(
    "First report comment id",
    reportByUser1OnUser2Comment.comment.id,
    commentByUser2.id,
  );
  TestValidator.equals(
    "First report reporter user id",
    reportByUser1OnUser2Comment.reporterUser.id,
    user1Auth.id,
  );
  TestValidator.equals(
    "Second report status",
    reportByUser2OnUser1Comment.status,
    "pending",
  );
  TestValidator.equals(
    "Second report comment id",
    reportByUser2OnUser1Comment.comment.id,
    commentByUser1.id,
  );
  TestValidator.equals(
    "Second report reporter user id",
    reportByUser2OnUser1Comment.reporterUser.id,
    user2Auth.id,
  );
}
