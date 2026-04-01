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

export async function test_api_member_comment_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(auth);
  // 2. Retrieve member's comment list with default pagination
  const commentsResponse: IPageIRedditCommunityComment.ISummary =
    await api.functional.redditCommunity.member.members.comments.index(
      memberConnection,
      {
        memberId: auth.id,
        body: {
          sort: "best",
          limit: 20,
          page: 1,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(commentsResponse);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    commentsResponse.pagination !== undefined,
  );
  TestValidator.equals(
    "current page is 1",
    commentsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is positive",
    commentsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    commentsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    commentsResponse.pagination.pages >= 0,
  );
  // 4. Validate comment data structure
  TestValidator.predicate(
    "data array exists",
    Array.isArray(commentsResponse.data),
  );
  // 5. Validate each comment (typia.assert handles type validation)
  for (const comment of commentsResponse.data) {
    typia.assert(comment);
    typia.assert(comment.author);
    // Business logic: soft-deleted comments should be excluded
    TestValidator.predicate(
      "comment is not soft-deleted",
      comment.deleted_at === null,
    );
    // Business logic: author should match the authenticated member
    TestValidator.equals(
      "author id matches member",
      comment.author.id,
      auth.id,
    );
  }
  // 6. Validate pagination consistency
  TestValidator.predicate(
    "data length matches records",
    commentsResponse.data.length === commentsResponse.pagination.records,
  );
}
