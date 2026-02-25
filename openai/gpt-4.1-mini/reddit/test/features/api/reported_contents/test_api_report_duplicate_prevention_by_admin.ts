import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import type { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_report_duplicate_prevention_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Prevent admin from creating duplicate content reports on the same post or comment with identical reason.
  // 1. Admin join (register) to obtain an authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(connection, {});
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // Prepare report body - simulate a post report
  const baseReportBody = {
    postId: typia.random<string & tags.Format<"uuid">>(),
    commentId: null,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    communityPlatformReportReasonId: typia.random<
      string & tags.Format<"uuid">
    >(),
  } satisfies ICommunityPlatformReport.ICreate;
  // Create initial report
  const firstReport =
    await api.functional.communityPlatform.admin.reportedContents.create(
      adminConnection,
      { body: baseReportBody },
    );
  typia.assert(firstReport);
  // Attempt to create duplicate report with same postId and reason
  const duplicateReportBody = {
    ...baseReportBody,
  } satisfies ICommunityPlatformReport.ICreate;
  await TestValidator.error(
    "reject duplicate report with same content and reason",
    async () => {
      await api.functional.communityPlatform.admin.reportedContents.create(
        adminConnection,
        { body: duplicateReportBody },
      );
    },
  );
  // Also test with commentId scenario
  const commentReportBody = {
    postId: null,
    commentId: typia.random<string & tags.Format<"uuid">>(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    communityPlatformReportReasonId: typia.random<
      string & tags.Format<"uuid">
    >(),
  } satisfies ICommunityPlatformReport.ICreate;
  const firstCommentReport =
    await api.functional.communityPlatform.admin.reportedContents.create(
      adminConnection,
      { body: commentReportBody },
    );
  typia.assert(firstCommentReport);
  // Attempt duplicate on comment report
  await TestValidator.error(
    "reject duplicate report on comment with same reason",
    async () => {
      await api.functional.communityPlatform.admin.reportedContents.create(
        adminConnection,
        { body: commentReportBody },
      );
    },
  );
}
