import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_comment_thread_retrieval_best_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Use a random valid UUID as postId (real post must exist in system)
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the comment thread with 'best' sort
  const response =
    await api.functional.redditCommunity.member.posts.comments.index(
      memberConnection,
      {
        postId,
        body: {
          sort: "best",
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate response structure
  TestValidator.equals("pagination structure", response.pagination, {
    current: 1,
    limit: 50, // default limit
    records: response.pagination.records, // we don't know exact count, but must be >= 0
    pages: response.pagination.pages, // calculated from records and limit
  });
  // 5. Validate data structure
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  if (response.data.length > 0) {
    const comment = response.data[0];
    TestValidator.equals(
      "comment has correct id format",
      typeof comment.id,
      "string",
    );
    TestValidator.predicate("comment has non-empty content", comment.content.length > 0);
    TestValidator.equals(
      "comment has correct author structure",
      comment.author.id,
      comment.author.id,
    );
    TestValidator.predicate("author has username", comment.author.username.length > 0);
  }
  // 6. Validate that pagination metadata is consistent
  TestValidator.predicate("records >= 0", response.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", response.pagination.pages >= 0);
  TestValidator.predicate("limit > 0", response.pagination.limit > 0);
  TestValidator.predicate("current >= 1", response.pagination.current >= 1);
  TestValidator.predicate(
    "records / limit <= pages + 1",
    response.pagination.records <=
      response.pagination.limit * (response.pagination.pages + 1),
  );
}