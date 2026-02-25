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

export async function test_api_user_report_comment_without_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authorization
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  userConnection.headers = { Authorization: `Bearer ${user.token.access}` };
  // 2. Create a new comment to report
  const comment =
    await generate_random_community_platform_user_comments_create_comment(
      userConnection,
      {},
    );
  typia.assert(comment);
  // 3. Submit a report for the comment without reportReasonId (only description)
  const description = RandomGenerator.paragraph({ sentences: 3 });
  const report =
    await generate_random_community_platform_user_reports_comments_report_create_comment_report(
      userConnection,
      {
        params: { commentId: comment.id },
        body: { description },
      },
    );
  typia.assert(report);
  // 4. Validate the report
  TestValidator.equals("status should be pending", report.status, "pending");
  TestValidator.equals("description matches", report.description, description);
  TestValidator.equals("comment id matches", report.comment.id, comment.id);
  TestValidator.equals(
    "reporter user id matches",
    report.reporterUser.id,
    user.id,
  );
  // 5. Validate timestamps are ISO 8601 date strings and not empty
  TestValidator.predicate(
    "createdAt is ISO 8601 format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/.test(
      report.createdAt,
    ),
  );
  TestValidator.predicate(
    "updatedAt is ISO 8601 format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/.test(
      report.updatedAt,
    ),
  );
  // 6. reportReason should be null as not specified
  TestValidator.equals("reportReason is null", report.reportReason, null);
}
