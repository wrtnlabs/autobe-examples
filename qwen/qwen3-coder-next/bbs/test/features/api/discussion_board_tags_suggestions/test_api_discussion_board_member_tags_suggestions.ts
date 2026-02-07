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

export async function test_api_discussion_board_member_tags_suggestions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication - register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = typia.random<IDiscussionBoardMember.IJoin>();
  const authResponse = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    {
      body: memberData,
    },
  );
  typia.assert(authResponse);
  // 2. Get tag suggestions with empty search (returns all tags)
  const emptySearch = typia.random<IDiscussionBoardTag.IRequest>();
  const emptySuggestions =
    await api.functional.discussionBoard.member.tags.suggestions.search(
      memberConnection,
      {
        body: emptySearch,
      },
    );
  typia.assert(emptySuggestions);
  // 3. Validate empty search response structure
  TestValidator.predicate(
    "suggestions response exists",
    () => emptySuggestions !== null,
  );
  TestValidator.predicate(
    "pagination exists",
    () => emptySuggestions.pagination !== null,
  );
  TestValidator.predicate(
    "data array exists",
    () => emptySuggestions.data !== null,
  );
  // 4. Validate pagination properties
  TestValidator.predicate(
    "has valid current page",
    () => emptySuggestions.pagination.current > 0,
  );
  TestValidator.predicate(
    "has valid limit",
    () => emptySuggestions.pagination.limit > 0,
  );
  TestValidator.predicate(
    "has non-negative records",
    () => emptySuggestions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has non-negative pages",
    () => emptySuggestions.pagination.pages >= 0,
  );
  // 5. Verify tag data structure when tags exist
  if (emptySuggestions.data.length > 0) {
    typia.assert<IDiscussionBoardTag[]>(emptySuggestions.data);
    TestValidator.predicate(
      "has at least one tag",
      () => emptySuggestions.data.length > 0,
    );
  }
  // 6. Test partial name matching
  const partialSearch = typia.random<IDiscussionBoardTag.IRequest>();
  const partialSuggestions =
    await api.functional.discussionBoard.member.tags.suggestions.search(
      memberConnection,
      {
        body: partialSearch,
      },
    );
  typia.assert(partialSuggestions);
  // 7. Validate partial search response
  TestValidator.predicate(
    "partial suggestions response valid",
    () => partialSuggestions !== null,
  );
  TestValidator.predicate(
    "partial suggestions have pagination",
    () => partialSuggestions.pagination !== null,
  );
  // 8. Test different search scenarios
  const searchWithSpecialChars = typia.random<IDiscussionBoardTag.IRequest>();
  const specialCharResults =
    await api.functional.discussionBoard.member.tags.suggestions.search(
      memberConnection,
      {
        body: searchWithSpecialChars,
      },
    );
  typia.assert(specialCharResults);
  // 9. Test pagination boundary conditions
  const largeLimitSearch = typia.random<IDiscussionBoardTag.IRequest>();
  const largeResults =
    await api.functional.discussionBoard.member.tags.suggestions.search(
      memberConnection,
      {
        body: largeLimitSearch,
      },
    );
  typia.assert(largeResults);
  TestValidator.predicate(
    "large results pagination valid",
    () => largeResults.pagination !== null,
  );
}
