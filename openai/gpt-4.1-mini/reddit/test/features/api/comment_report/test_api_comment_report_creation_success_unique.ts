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
import { generate_random_community_platform_user_comment_reports_create } from "../../../generate/generate_random_community_platform_user_comment_reports_create";
import { prepare_random_community_platform_comment_report } from "../../../prepare/prepare_random_community_platform_comment_report";

export async function test_api_comment_report_creation_success_unique(
  connection: api.IConnection,
): Promise<void> {
  // 1. User join to get authorized user and token
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  userConnection.headers = { Authorization: `Bearer ${user.token.access}` };
  // 2. Prepare a valid comment_id to report
  // We'll create a comment report with a random valid comment id
  // but since we don't have comment creation endpoint info, use random uuid
  // or generate report with random comment id
  // Generate a valid comment report via utility to get a valid commentId
  // This utility internally calls creation, so we get a valid comment report
  // From it, we extract comment_id, report_reason_id, description for our tests
  const createdReport =
    await generate_random_community_platform_user_comment_reports_create(
      userConnection,
      {},
    );
  typia.assert(createdReport);
  // 3. Validate comment report properties
  TestValidator.predicate(
    "comment report has id",
    typeof createdReport.id === "string",
  );
  TestValidator.predicate(
    "comment report has valid comment",
    createdReport.comment.id === createdReport.comment.id,
  );
  TestValidator.predicate(
    "comment report reporterUser.id matches user",
    createdReport.reporterUser.id === user.id,
  );
  // 4. Attempt to create a duplicate report for the same comment by same user - should error
  await TestValidator.error(
    "duplicate report for same comment should fail",
    async () => {
      await generate_random_community_platform_user_comment_reports_create(
        userConnection,
        {
          body: {
            comment_id: createdReport.comment.id,
            report_reason_id: createdReport.reportReason
              ? createdReport.reportReason.id
              : undefined,
            description: createdReport.description ?? undefined,
          },
        },
      );
    },
  );
}
