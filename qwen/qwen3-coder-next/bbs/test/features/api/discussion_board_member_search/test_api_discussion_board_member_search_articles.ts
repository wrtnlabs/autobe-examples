import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_discussion_board_member_search_articles(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      // IDiscussionBoardMember.IJoin has no required fields currently
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 2. Search with empty request body (baseline)
  const searchEmpty =
    await api.functional.discussionBoard.member.search.articles.index(
      memberConnection,
      {
        body: {} satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchEmpty);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    searchEmpty.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination.current >= 1",
    searchEmpty.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination.limit >= 0",
    searchEmpty.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records >= 0",
    searchEmpty.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages >= 0",
    searchEmpty.pagination.pages >= 0,
  );
  // 4. Validate data array structure
  TestValidator.predicate("data array exists", Array.isArray(searchEmpty.data));
  TestValidator.predicate("data length >= 0", searchEmpty.data.length >= 0);
  // 5. Validate article summary structure in data
  for (const article of searchEmpty.data) {
    typia.assert<IDiscussionBoardArticle.ISummary>(article);
  }
  // 6. Test with explicit empty object
  const searchExplicit =
    await api.functional.discussionBoard.member.search.articles.index(
      memberConnection,
      {
        body: {} satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchExplicit);
  // 7. Validate response consistency
  TestValidator.equals(
    "pagination matches",
    searchEmpty.pagination.current,
    searchExplicit.pagination.current,
  );
  TestValidator.equals(
    "data count matches",
    searchEmpty.data.length,
    searchExplicit.data.length,
  );
}
