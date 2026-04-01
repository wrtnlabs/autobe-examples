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

export async function test_api_member_comment_list_soft_deleted_exclusion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Retrieve member's comment list with default parameters
  const commentList =
    await api.functional.redditCommunity.member.members.comments.index(
      memberConnection,
      {
        memberId: memberAuth.id,
        body: {
          limit: 20,
          page: 1,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(commentList);
  // 3. Validate all returned comments have deleted_at as null (soft-deleted excluded)
  TestValidator.predicate(
    "all comments should have deleted_at as null",
    commentList.data.every((comment) => comment.deleted_at === null),
  );
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "records count should match data array length",
    commentList.pagination.records === commentList.data.length,
  );
  TestValidator.predicate(
    "current page should be 1",
    commentList.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit should be 20",
    commentList.pagination.limit === 20,
  );
  // 5. Test with different sorting options to ensure soft-deletion exclusion works consistently
  const sortOptions: Array<"best" | "new" | "controversial"> = [
    "best",
    "new",
    "controversial",
  ];
  for (const sort of sortOptions) {
    const sortedCommentList =
      await api.functional.redditCommunity.member.members.comments.index(
        memberConnection,
        {
          memberId: memberAuth.id,
          body: {
            sort: sort,
            limit: 50,
            page: 1,
          } satisfies IRedditCommunityComment.IRequest,
        },
      );
    typia.assert(sortedCommentList);
    TestValidator.predicate(
      `all comments with sort=${sort} should have deleted_at as null`,
      sortedCommentList.data.every((comment) => comment.deleted_at === null),
    );
    TestValidator.predicate(
      `records count matches data length for sort=${sort}`,
      sortedCommentList.pagination.records === sortedCommentList.data.length,
    );
  }
  // 6. Test with date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateFilteredCommentList =
    await api.functional.redditCommunity.member.members.comments.index(
      memberConnection,
      {
        memberId: memberAuth.id,
        body: {
          created_at_from: oneDayAgo.toISOString(),
          created_at_to: oneDayLater.toISOString(),
          limit: 20,
          page: 1,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(dateFilteredCommentList);
  TestValidator.predicate(
    "date-filtered comments should have deleted_at as null",
    dateFilteredCommentList.data.every(
      (comment) => comment.deleted_at === null,
    ),
  );
  // 7. Validate empty result case (member with no comments)
  TestValidator.predicate(
    "empty comment list should have records=0 and pages=0",
    commentList.data.length === 0
      ? commentList.pagination.records === 0 &&
          commentList.pagination.pages === 0
      : true,
  );
  // 8. Validate pages calculation when there are comments
  if (commentList.data.length > 0) {
    const expectedPages = Math.ceil(
      commentList.pagination.records / commentList.pagination.limit,
    );
    TestValidator.equals(
      "pages should be calculated correctly",
      commentList.pagination.pages,
      expectedPages,
    );
  }
}
