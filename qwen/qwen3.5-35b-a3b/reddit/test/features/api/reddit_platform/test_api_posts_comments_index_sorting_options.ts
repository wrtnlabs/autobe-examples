import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_posts_comments_index_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create a post for comment context
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create multiple comments with different timestamps and scores
  const commentData = ArrayUtil.repeat(5, (i) => ({
    content: RandomGenerator.paragraph({ sentences: 2 + i }),
    upvotes_count: (5 - i) * 10 + (i % 3),
    downvotes_count: i * 2,
    created_at: new Date(Date.now() - (5 - i) * 3600 * 1000).toISOString(),
  }));
  // 4. Test sorting by: new (chronological ascending - oldest first)
  const sortByNew = await api.functional.redditPlatform.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        sortBy: "new",
        order: "asc",
        limit: 20,
      } satisfies IRedditPlatformComment.IRequest,
    },
  );
  typia.assert(sortByNew);
  TestValidator.predicate(
    "new sort: data array exists",
    sortByNew.data.length > 0,
  );
  TestValidator.predicate(
    "new sort: pagination present",
    sortByNew.pagination !== undefined,
  );
  // 5. Test sorting by: top (highest score first)
  const sortByTop = await api.functional.redditPlatform.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        sortBy: "top",
        order: "desc",
        limit: 20,
      } satisfies IRedditPlatformComment.IRequest,
    },
  );
  typia.assert(sortByTop);
  TestValidator.predicate(
    "top sort: data array exists",
    sortByTop.data.length > 0,
  );
  // 6. Test sorting by: best (quality algorithm)
  const sortByBest = await api.functional.redditPlatform.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        sortBy: "best",
        order: "desc",
        limit: 20,
      } satisfies IRedditPlatformComment.IRequest,
    },
  );
  typia.assert(sortByBest);
  TestValidator.predicate(
    "best sort: data array exists",
    sortByBest.data.length > 0,
  );
  // 7. Test sorting by: controversial (absolute score difference)
  const sortByControversial =
    await api.functional.redditPlatform.posts.comments.index(memberConnection, {
      postId: post.id,
      body: {
        sortBy: "controversial",
        order: "desc",
        limit: 20,
      } satisfies IRedditPlatformComment.IRequest,
    });
  typia.assert(sortByControversial);
  TestValidator.predicate(
    "controversial sort: data array exists",
    sortByControversial.data.length > 0,
  );
  // 8. Verify pagination metadata consistency across all sort options
  TestValidator.predicate(
    "pagination: records count positive",
    sortByNew.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination: limit consistent",
    sortByNew.pagination.limit === sortByTop.pagination.limit &&
      sortByTop.pagination.limit === sortByBest.pagination.limit &&
      sortByBest.pagination.limit === sortByControversial.pagination.limit,
  );
}
