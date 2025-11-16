import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Validates that a community moderator can successfully delete a content report
 * by its unique ID.
 *
 * This test ensures that the moderator can register, receive authorization, and
 * perform a deletion operation on a specified content report. It verifies
 * proper request and response handling in the deletion flow within the reddit
 * community platform.
 *
 * Steps:
 *
 * 1. Community Moderator registers via the join API to obtain authorization.
 * 2. Moderators delete a specific content report by ID using the delete API.
 * 3. Validates the authorization response structure.
 * 4. Ensures the delete operation completes successfully without errors.
 */
export async function test_api_redditcommunity_community_moderator_delete_report_by_id(
  connection: api.IConnection,
) {
  // 1. Register as Community Moderator to create authorization context
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "StrongPassword123!",
        nickname: RandomGenerator.name(2),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  TestValidator.predicate(
    "Moderator ID must be a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderator.id,
    ),
  );
  TestValidator.predicate(
    "Moderator email matches input",
    moderator.email === moderatorEmail,
  );
  TestValidator.predicate(
    "Moderator token access is non-empty",
    !!moderator.token.access,
  );

  // 2. Delete a content report by ID
  const reportId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await api.functional.redditCommunity.communityModerator.redditCommunityReports.erase(
    connection,
    {
      id: reportId,
    },
  );
}
