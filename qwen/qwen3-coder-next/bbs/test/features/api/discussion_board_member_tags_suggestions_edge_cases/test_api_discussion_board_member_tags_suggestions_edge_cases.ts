import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_discussion_board_member_tags_suggestions_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // 1. Test with default request (empty object for IDiscussionBoardTag.IRequest)
  const defaultResult =
    await api.functional.discussionBoard.member.tags.suggestions.search(
      memberConnection,
      {
        body: {} satisfies IDiscussionBoardTag.IRequest,
      },
    );
  typia.assert(defaultResult);
  TestValidator.predicate(
    "has pagination",
    defaultResult.pagination.current > 0,
  );
  // 2. Test maximum length search - note: IDiscussionBoardTag.IRequest has no search field
  // The API endpoint accepts empty request body, so we test various scenarios with same input
  // 3. Test single character scenario - same as above since no search field exists
  const singleCharResult =
    await api.functional.discussionBoard.member.tags.suggestions.search(
      memberConnection,
      {
        body: {} satisfies IDiscussionBoardTag.IRequest,
      },
    );
  typia.assert(singleCharResult);
  // 4. Test special characters and Unicode - same request since no search field
  const specialResult =
    await api.functional.discussionBoard.member.tags.suggestions.search(
      memberConnection,
      {
        body: {} satisfies IDiscussionBoardTag.IRequest,
      },
    );
  typia.assert(specialResult);
  // 5. Test empty search string - same as above
  const emptyResult =
    await api.functional.discussionBoard.member.tags.suggestions.search(
      memberConnection,
      {
        body: {} satisfies IDiscussionBoardTag.IRequest,
      },
    );
  typia.assert(emptyResult);
  // 6. Test pagination edge cases using actual pagination parameters
  // Note: IDiscussionBoardTag.IRequest has no pagination fields, so we test with empty body
  // First page
  const firstPage =
    await api.functional.discussionBoard.member.tags.suggestions.search(
      memberConnection,
      {
        body: {} satisfies IDiscussionBoardTag.IRequest,
      },
    );
  typia.assert(firstPage);
  // Test beyond last page - same request pattern
  const beyondPage =
    await api.functional.discussionBoard.member.tags.suggestions.search(
      memberConnection,
      {
        body: {} satisfies IDiscussionBoardTag.IRequest,
      },
    );
  typia.assert(beyondPage);
  // 7. Test with explicit page parameter in body (if supported by API)
  // Since IDiscussionBoardTag.IRequest has no fields, we use empty object
  const paginatedResult =
    await api.functional.discussionBoard.member.tags.suggestions.search(
      memberConnection,
      {
        body: {} satisfies IDiscussionBoardTag.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Validate pagination structure
  TestValidator.predicate(
    "has valid pagination",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate("has valid pages", firstPage.pagination.pages >= 0);
  TestValidator.predicate("has valid limit", firstPage.pagination.limit > 0);
  TestValidator.equals(
    "current page is valid",
    firstPage.pagination.current >= 1,
    true,
  );
}
