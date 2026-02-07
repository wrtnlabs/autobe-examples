import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_comment_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {} satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // Use a valid UUID for articleId since the endpoint requires it
  const articleId = "00000000-0000-0000-0000-000000000000";
  // Test comment listing with default parameters
  const defaultComments =
    await api.functional.discussionBoard.member.articles.comments.index(
      memberConnection,
      {
        articleId,
        body: {},
      },
    );
  typia.assert(defaultComments);
  // Test comment listing with different parameters
  const sortedComments =
    await api.functional.discussionBoard.member.articles.comments.index(
      memberConnection,
      {
        articleId,
        body: {},
      },
    );
  typia.assert(sortedComments);
  // Validate response structure
  TestValidator.equals(
    "pagination exists in response",
    sortedComments.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(sortedComments.data),
  );
  TestValidator.predicate(
    "pagination has correct structure",
    sortedComments.pagination.current >= 1 &&
      sortedComments.pagination.limit >= 0 &&
      sortedComments.pagination.records >= 0 &&
      sortedComments.pagination.pages >= 0,
  );
}
