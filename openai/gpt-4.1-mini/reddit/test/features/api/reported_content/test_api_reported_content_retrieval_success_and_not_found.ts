import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_reported_content_retrieval_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Retrieve reported content details by moderator join authenticated user
  // 1. Moderator join and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: typia.random<ICommunityPlatformModerator.IJoin>(),
    });
  moderatorConnection.headers = { Authorization: authorized.token.access };
  // 2. Use random valid UUIDs for reportId and reportedContentId
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const reportedContentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call API to get reported content details - success case
  const reportedContent: ICommunityPlatformReportedContent =
    await api.functional.communityPlatform.moderator.reports.reportedContents.at(
      moderatorConnection,
      {
        reportId,
        reportedContentId,
      },
    );
  // 4. Validate the response type structure
  typia.assert(reportedContent);
  // 5. Validate critical fields
  TestValidator.predicate(
    "createdAt exists and is date-time",
    typeof reportedContent.createdAt === "string" &&
      reportedContent.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt exists and is date-time",
    typeof reportedContent.updatedAt === "string" &&
      reportedContent.updatedAt.length > 0,
  );
  // deletedAt can be null or string
  TestValidator.predicate(
    "deletedAt is string or null",
    reportedContent.deletedAt === null ||
      (typeof reportedContent.deletedAt === "string" &&
        reportedContent.deletedAt.length > 0),
  );
  // 6. Validate that reportedContentId matches the request ID
  TestValidator.equals(
    "Reported Content ID matches request",
    reportedContent.id,
    reportedContentId satisfies string as string,
  );
  // 7. Call API with non-existent IDs to get 404 error
  const randomInvalidReportId = typia.random<string & tags.Format<"uuid">>();
  const randomInvalidReportedContentId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "Reported content fetch with invalid IDs returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.reports.reportedContents.at(
        moderatorConnection,
        {
          reportId: randomInvalidReportId,
          reportedContentId: randomInvalidReportedContentId,
        },
      );
    },
  );
}
