import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_reported_content_update_nullable_links_clearing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinBody = {
    email: `moderator_${RandomGenerator.alphaNumeric(8)}@example.com`,
    username: RandomGenerator.name(1),
    displayName: null,
    bio: null,
    avatarUrl: null,
  } satisfies ICommunityPlatformModerator.IJoin;
  const authorizedModerator = await authorize_moderator_join(
    moderatorConnection,
    { body: moderatorJoinBody },
  );
  typia.assert(authorizedModerator);
  moderatorConnection.headers = {
    Authorization: authorizedModerator.token.access,
  };
  // 2. Create initial reported content that is linked to some post and comment
  const initialReportedContentCreateBody =
    typia.random<ICommunityPlatformReport.ICreate>();
  // We cannot create directly reported content, but create a report with reported content.
  // So we use reportedContents.create for that.
  const createdReport =
    await api.functional.communityPlatform.moderator.reportedContents.create(
      moderatorConnection,
      {
        body: initialReportedContentCreateBody,
      },
    );
  typia.assert(createdReport);
  // Find a reported content linked to the created report to update
  const reportedContentToUpdate = createdReport.reportedContents[0];
  // 3. Update reported content clearing nullable links
  const updateBody: ICommunityPlatformReportedContent.IUpdate = {
    community_platform_report_id:
      reportedContentToUpdate.communityPlatformReportId ?? null,
    community_platform_reported_post_id: null,
    community_platform_reported_comment_id: null,
  };
  const updatedReportedContent =
    await api.functional.communityPlatform.moderator.reportedContents.update(
      moderatorConnection,
      {
        id: reportedContentToUpdate.id,
        body: updateBody,
      },
    );
  typia.assert(updatedReportedContent);
  // 4. Validate update has preserved the record but cleared post and comment IDs
  TestValidator.equals(
    "report ID unchanged after update",
    updatedReportedContent.communityPlatformReportId,
    reportedContentToUpdate.communityPlatformReportId,
  );
  TestValidator.equals(
    "post ID cleared",
    updatedReportedContent.communityPlatformReportedPostId,
    null,
  );
  TestValidator.equals(
    "comment ID cleared",
    updatedReportedContent.communityPlatformReportedCommentId,
    null,
  );
}
