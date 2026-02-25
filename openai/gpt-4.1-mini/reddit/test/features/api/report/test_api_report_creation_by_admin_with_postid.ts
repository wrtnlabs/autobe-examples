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

export async function test_api_report_creation_by_admin_with_postid(
  connection: api.IConnection,
): Promise<void> {
  // This E2E test covers the report creation by an authenticated admin specifying a postId.
  // 1. Admin joins and authenticates.
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "strong_password123",
      displayName: "AdminUser",
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(admin);
  // 2. Prepare a valid report reason for the report creation.
  // Since report reasons not creatable via API, we simulate a reason ID (UUID string).
  // For test, we generate a random UUID as reason ID.
  const reasonId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create a report using postId (not commentId).
  const postId = typia.random<string & tags.Format<"uuid">>();
  const reportBody: ICommunityPlatformReport.ICreate = {
    communityPlatformReportReasonId: reasonId,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    // Only postId defined. commentId must be undefined.
    communityPlatformReportedPostId: postId,
    communityPlatformReportedCommentId: null,
  };
  const createdReport =
    await api.functional.communityPlatform.admin.reportedContents.create(
      adminConnection,
      { body: reportBody },
    );
  typia.assert(createdReport);
  // 4. Validate mandatory properties.
  TestValidator.predicate(
    "Report status is pending",
    createdReport.status === "pending",
  );
  TestValidator.equals(
    "Report reason ID matches",
    createdReport.communityPlatformReportReasonId,
    reasonId,
  );
  // 5. Validate that the report contains the reporter user details.
  TestValidator.predicate(
    "Reporter user ID exists",
    typeof createdReport.user.id === "string" &&
      createdReport.user.id.length > 0,
  );
  // 6. Validate timestamps are valid ISO strings.
  TestValidator.predicate(
    "Report createdAt is ISO string",
    typeof createdReport.createdAt === "string" &&
      createdReport.createdAt.length > 0,
  );
  TestValidator.predicate(
    "Report updatedAt is ISO string",
    typeof createdReport.updatedAt === "string" &&
      createdReport.updatedAt.length > 0,
  );
  // 7. Validate linked reported contents include our postId with proper link.
  TestValidator.predicate(
    "Reported contents includes the correct postId",
    createdReport.reportedContents.some(
      (c) => c.communityPlatformReportedPostId === postId,
    ),
  );
  // 8. Validate comment ID is not set in linked contents.
  TestValidator.predicate(
    "Comment IDs in reported content are null",
    createdReport.reportedContents.every(
      (c) => c.communityPlatformReportedCommentId === null,
    ),
  );
  // 9. Authorization test: Unauthorized connection cannot create.
  await TestValidator.httpError(
    "Unauthorized report creation is forbidden",
    401,
    async () => {
      await api.functional.communityPlatform.admin.reportedContents.create(
        connection,
        {
          body: reportBody,
        },
      );
    },
  );
}
