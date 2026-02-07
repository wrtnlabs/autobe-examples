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

export async function test_api_member_comment_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      // IDiscussionBoardMember.IJoin has no required fields currently
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 2. Generate a proper UUID for articleId
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve paginated comments
  const response =
    await api.functional.discussionBoard.member.articles.comments.index(
      memberConnection,
      {
        articleId: articleId,
        body: {
          // IDiscussionBoardArticleComment.IRequest has no required fields currently
        } satisfies IDiscussionBoardArticleComment.IRequest,
      },
    );
  // 4. Validate response structure
  typia.assert(response);
  // 5. Validate pagination metadata matches expected defaults
  TestValidator.equals("pagination current", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.equals("pagination records", response.pagination.records, 0);
  TestValidator.equals("pagination pages", response.pagination.pages, 0);
  // 6. Validate comment data array is empty
  TestValidator.equals("comments array length", response.data.length, 0);
  TestValidator.equals(
    "comments data is array",
    Array.isArray(response.data),
    true,
  );
}
