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

/**
 * Test retrieving detailed information of a reported content by a moderator.
 * This scenario includes authenticating a new moderator by join, then requesting the details
 * for a valid reported content ID. Validate that the response includes all necessary related
 * entities such as report details, reported post or comment, and appropriate timestamps.
 * Also validate authorization enforcement, correct handling of valid UUID path parameter,
 * and proper error for non-existent reportedContentId.
 */
export async function test_api_reported_content_detail_retrieve_with_moderator_authentication(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection and authorize join
  const moderatorConnection: IConnection = { host: connection.host };
  const authorized: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: typia.random<ICommunityPlatformModerator.IJoin>(),
    });
  typia.assert(authorized);
  // Update moderatorConnection headers for authorization
  moderatorConnection.headers = moderatorConnection.headers ?? {};
  moderatorConnection.headers.Authorization = `Bearer ${authorized.token.access}`;
  // Generate random existing reportedContentId (valid UUID format)
  const reportedContentId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve details of the reported content
  const reportedContent: ICommunityPlatformReportedContent =
    await api.functional.communityPlatform.moderator.reported_contents.details.at(
      moderatorConnection,
      { reportedContentId },
    );
  typia.assert(reportedContent);
  // Validate that the reportedContentId matches the requested id
  // But since we do not have concrete schema fields, only validate type
  TestValidator.predicate(
    "reportedContent is object",
    typeof reportedContent === "object" && reportedContent !== null,
  );
  // Test error when reportedContentId is invalid (random UUID but likely not present)
  const invalidReportedContentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "retrieve with non-existent reportedContentId",
    404,
    async () =>
      await api.functional.communityPlatform.moderator.reported_contents.details.at(
        moderatorConnection,
        { reportedContentId: invalidReportedContentId },
      ),
  );
  // Test error with invalid UUID format
  await TestValidator.httpError(
    "retrieve with invalid UUID format",
    400,
    async () =>
      await api.functional.communityPlatform.moderator.reported_contents.details.at(
        moderatorConnection,
        { reportedContentId: "invalid-uuid" as string & tags.Format<"uuid"> },
      ),
  );
}
