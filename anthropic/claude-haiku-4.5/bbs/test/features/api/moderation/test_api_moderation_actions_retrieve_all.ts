import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";

export async function test_api_moderation_actions_retrieve_all(
  connection: api.IConnection,
) {
  // Step 1: Moderator authentication
  const moderatorCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<30> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderatorAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateData,
    });
  typia.assert(moderatorAuth);

  TestValidator.equals(
    "moderator authentication returns valid authorization token",
    moderatorAuth.token.access.length > 0,
    true,
  );

  // Step 2: Retrieve moderation actions without filters (first page)
  const firstPageRequest = {
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardModerationAction.IRequest;

  const firstPageResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: firstPageRequest,
      },
    );
  typia.assert(firstPageResult);

  TestValidator.predicate(
    "pagination metadata exists",
    firstPageResult.pagination !== null &&
      firstPageResult.pagination !== undefined,
  );

  TestValidator.equals(
    "current page is 1",
    firstPageResult.pagination.current,
    1,
  );

  TestValidator.equals(
    "limit matches request",
    firstPageResult.pagination.limit,
    10,
  );

  TestValidator.predicate(
    "total records is a non-negative number",
    firstPageResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages is a non-negative number",
    firstPageResult.pagination.pages >= 0,
  );

  // Step 3: Validate moderation action structure for each action
  if (firstPageResult.data.length > 0) {
    const action = firstPageResult.data[0];

    TestValidator.predicate(
      "action has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        action.id,
      ),
    );

    TestValidator.predicate(
      "moderator id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        action.moderatorId,
      ),
    );

    TestValidator.predicate(
      "member id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        action.memberId,
      ),
    );

    TestValidator.predicate(
      "content id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        action.content_id,
      ),
    );

    TestValidator.predicate(
      "action_type is one of valid values",
      [
        "approved",
        "rejected",
        "requested_changes",
        "deleted_article",
        "deleted_comment",
        "edited_article",
        "edited_comment",
        "flagged",
      ].includes(action.action_type),
    );

    TestValidator.predicate(
      "content_type is article or comment",
      ["article", "comment"].includes(action.content_type),
    );

    TestValidator.predicate(
      "reason is between 10 and 500 characters",
      action.reason.length >= 10 && action.reason.length <= 500,
    );

    TestValidator.predicate(
      "created_at is valid ISO 8601 date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(action.created_at),
    );

    if (action.notes !== null && action.notes !== undefined) {
      TestValidator.predicate(
        "notes is at most 1000 characters when present",
        action.notes.length <= 1000,
      );
    }
  }

  // Step 4: Retrieve with different pagination parameters
  const secondPageRequest = {
    page: 2,
    limit: 5,
  } satisfies IDiscussionBoardModerationAction.IRequest;

  const secondPageResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: secondPageRequest,
      },
    );
  typia.assert(secondPageResult);

  TestValidator.equals(
    "second page request returns correct page number",
    secondPageResult.pagination.current,
    2,
  );

  TestValidator.equals(
    "second page request returns correct limit",
    secondPageResult.pagination.limit,
    5,
  );

  // Step 5: Retrieve with search filter
  const searchRequest = {
    page: 1,
    limit: 10,
    search: "test",
  } satisfies IDiscussionBoardModerationAction.IRequest;

  const searchResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchResult);

  TestValidator.predicate(
    "search result returns valid page structure",
    searchResult.pagination !== null && searchResult.pagination !== undefined,
  );

  // Step 6: Retrieve with action type filter
  const actionTypeRequest = {
    page: 1,
    limit: 10,
    actionType: "approved",
  } satisfies IDiscussionBoardModerationAction.IRequest;

  const actionTypeResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: actionTypeRequest,
      },
    );
  typia.assert(actionTypeResult);

  TestValidator.predicate(
    "action type filter result returns valid structure",
    actionTypeResult.pagination !== null &&
      actionTypeResult.pagination !== undefined,
  );

  // Step 7: Retrieve with content type filter
  const contentTypeRequest = {
    page: 1,
    limit: 10,
    contentType: "article",
  } satisfies IDiscussionBoardModerationAction.IRequest;

  const contentTypeResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: contentTypeRequest,
      },
    );
  typia.assert(contentTypeResult);

  TestValidator.predicate(
    "content type filter result returns valid structure",
    contentTypeResult.pagination !== null &&
      contentTypeResult.pagination !== undefined,
  );

  // Step 8: Verify data consistency across requests
  TestValidator.predicate(
    "total records remain consistent across requests",
    firstPageResult.pagination.records === secondPageResult.pagination.records,
  );

  TestValidator.predicate(
    "total pages are calculated correctly",
    firstPageResult.pagination.pages ===
      Math.ceil(
        firstPageResult.pagination.records / firstPageResult.pagination.limit,
      ),
  );
}
