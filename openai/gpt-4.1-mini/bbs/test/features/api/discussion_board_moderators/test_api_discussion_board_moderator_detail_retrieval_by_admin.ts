import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardModerator";

export async function test_api_discussion_board_moderator_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register Admin user and authenticate
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "test-password-123",
    displayName: "Admin Tester",
  } satisfies IDiscussionBoardAdmin.IJoin;

  const adminAuthorized: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Retrieve Discussion Board Moderator details by id
  const moderatorId = adminAuthorized.id;

  const moderator: IDiscussionBoardDiscussionBoardModerator =
    await api.functional.discussionBoard.admin.discussionBoardModerators.at(
      connection,
      {
        discussionBoardModeratorId: moderatorId,
      },
    );
  typia.assert(moderator);

  // 3. Basic validation on returned moderator details
  TestValidator.equals(
    "Moderator ID matches requested ID",
    moderator.id,
    moderatorId,
  );

  TestValidator.predicate(
    "Moderator email is valid format",
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(moderator.email),
  );

  TestValidator.predicate(
    "Moderator display_name is non-empty",
    moderator.display_name.length > 0,
  );

  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

  TestValidator.predicate(
    "Moderator created_at is ISO 8601 date",
    iso8601Regex.test(moderator.created_at),
  );

  TestValidator.predicate(
    "Moderator updated_at is ISO 8601 date",
    iso8601Regex.test(moderator.updated_at),
  );

  TestValidator.predicate(
    "Moderator deleted_at is null or ISO 8601 date",
    moderator.deleted_at === null ||
      moderator.deleted_at === undefined ||
      (typeof moderator.deleted_at === "string" &&
        iso8601Regex.test(moderator.deleted_at)),
  );
}
