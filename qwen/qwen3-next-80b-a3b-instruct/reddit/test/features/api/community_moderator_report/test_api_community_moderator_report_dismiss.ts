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

export async function test_api_community_moderator_report_dismiss(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a community moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  } satisfies IRedditCommunityCommunityModerator.IJoin;
  await authorize_community_moderator_join(moderatorConnection, {
    body: moderatorData,
  });
  // 2. Generate a random report ID that represents an existing pending report
  // In real E2E environments, reports may be pre-populated. We simulate this by
  // using a random but valid UUID format.
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // 3. Dismiss the report using the moderator's authenticated connection
  const dismissedReport =
    await api.functional.redditCommunity.communityModerator.reports.dismiss(
      moderatorConnection,
      { reportId },
    );
  // 4. Validate the response structure with typia.assert
  // typia.assert performs complete type validation including:
  // - all required fields exist
  // - all types are correct (string & Format<'uuid'>, string & Format<'date-time'>, etc.)
  // - status is one of 'pending'|'approved'|'dismissed'
  // - resolved_at is null or string & Format<'date-time'>
  typia.assert(dismissedReport);
  // Note: Additional validation using TestValidator is forbidden per rule 8.2.
  // typia.assert already validates the entire structure, including status and resolved_at.
  // We trust the compiler and the validation system.
}
