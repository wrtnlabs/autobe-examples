import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDiscussionBoardModerator";

export async function test_api_discussion_board_moderator_list_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin registers (join) to obtain authorization token
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "strongPassword123",
    displayName: RandomGenerator.name(2),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // Step 2: Admin requests paginated and filtered list of moderators
  const filterEmail = adminEmail.split("@")[0];
  const listRequestBody = {
    email: filterEmail,
    display_name: admin.display_name,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardDiscussionBoardModerator.IRequest;

  const moderatorList: IPageIDiscussionBoardDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.admin.discussionBoardModerators.index(
      connection,
      { body: listRequestBody },
    );
  typia.assert(moderatorList);

  // Validate pagination metadata
  const pagination = moderatorList.pagination;
  TestValidator.predicate(
    "pagination.current is page 1",
    pagination.current === 1,
  );
  TestValidator.predicate("pagination.limit is 10", pagination.limit === 10);
  TestValidator.predicate(
    "pagination.pages is at least 1",
    pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    pagination.records >= 0,
  );

  TestValidator.predicate(
    "moderator list is not empty",
    moderatorList.data.length > 0,
  );

  // Validate each moderator summary
  for (const moderator of moderatorList.data) {
    typia.assert(moderator);
    TestValidator.predicate(
      "moderator email contains filter string",
      moderator.email.includes(filterEmail),
    );
    TestValidator.equals(
      "moderator display name matches",
      moderator.display_name,
      admin.display_name,
    );
  }
}
