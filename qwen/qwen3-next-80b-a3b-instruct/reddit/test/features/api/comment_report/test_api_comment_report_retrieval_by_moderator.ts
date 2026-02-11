import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";

export async function test_api_comment_report_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a community moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_community_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IRedditCommunityCommunityModerator.IJoin,
    },
  );
  // 2. Create a connection with the moderator's authorization token
  const moderatorWithToken: api.IConnection = { host: connection.host };
  moderatorWithToken.headers = { Authorization: moderator.access_token };
  // 3. Generate a random valid UUID for a report ID (since report creation API not available)
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve the comment report via the moderator endpoint
  const retrievedReport =
    await api.functional.redditCommunity.communityModerator.reports.at(
      moderatorWithToken,
      { reportId },
    );
  typia.assert(retrievedReport);
  // 5. Validate mandatory fields exist and are correctly typed
  TestValidator.predicate("report id is valid UUID", () => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      retrievedReport.id,
    );
  });
  TestValidator.predicate("comment_id is valid UUID", () => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      retrievedReport.comment_id,
    );
  });
  TestValidator.predicate("reporter_id is valid UUID", () => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      retrievedReport.reporter_id,
    );
  });
  TestValidator.predicate(
    "reason is string",
    () => typeof retrievedReport.reason === "string",
  );
  TestValidator.equals(
    "status is valid",
    retrievedReport.status,
    "pending" as const,
  );
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(retrievedReport.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    const date = new Date(retrievedReport.updated_at);
    return !isNaN(date.getTime());
  });
  TestValidator.equals(
    "resolved_at is null",
    retrievedReport.resolved_at,
    null,
  );
}
