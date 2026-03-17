import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";

/**
 * Test viewing another member's public comment history with pagination.
 *
 * **Setup:**
 * 1. Create member A (viewer) via /redditClone/auth/member/join
 * 2. Create member B (comment author) via /redditClone/auth/member/join
 * 3. Create a community owned by member A via /redditClone/communities
 * 4. Create a post in the community by member A via /redditClone/member/posts
 * 5. Create 25 comments on the post by member B via /redditClone/member/posts/{postId}/comments
 *
 * **Test Execution:**
 * 1. Member A retrieves member B's comment history with page=1, limit=20
 * 2. Verify response contains exactly 20 comments (first page)
 * 3. Verify pagination metadata shows correct total count (25), current page=1, limit=20, and total pages (2)
 * 4. Member A requests page=2 with limit=20
 * 5. Verify response contains remaining 5 comments
 * 6. Verify each comment summary includes all required fields
 * 7. Verify all comments are sorted by created_at DESC (newest first)
 */
export async function test_api_member_comment_history_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A (viewer)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create member B (comment author)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Create a community owned by member A
  const community = await generate_random_reddit_clone_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // 4. Create a post in the community by member A
  const post = await generate_random_reddit_clone_member_posts_create(
    memberAConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  typia.assert(post);
  // 5. Create 25 comments on the post by member B
  const commentCount = 25;
  const comments: IRedditCloneComment[] = [];
  for (let i = 0; i < commentCount; i++) {
    const comment =
      await generate_random_reddit_clone_member_posts_comments_create(
        memberBConnection,
        {
          params: { postId: post.id },
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // Sort comments by created_at DESC for validation
  const sortedComments = [...comments].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  // 6. Member A retrieves member B's comment history - page 1
  const page1Response =
    await api.functional.redditClone.member.members.comments.index(
      memberAConnection,
      {
        memberId: memberB.id,
        body: {
          page: 1,
          limit: 20,
          sort: "new",
        } satisfies IRedditCloneComment.IRequest,
      },
    );
  typia.assert(page1Response);
  // 7. Verify page 1 contains exactly 20 comments
  TestValidator.equals("page 1 comment count", page1Response.data.length, 20);
  // 8. Verify pagination metadata for page 1
  TestValidator.equals(
    "page 1 current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 20);
  TestValidator.equals(
    "page 1 total records",
    page1Response.pagination.records,
    25,
  );
  TestValidator.equals("page 1 total pages", page1Response.pagination.pages, 2);
  // 9. Verify each comment on page 1 has required fields and correct author
  for (const comment of page1Response.data) {
    TestValidator.equals(
      "comment author is member B",
      comment.author.id,
      memberB.id,
    );
    TestValidator.equals("comment post matches", comment.post.id, post.id);
    TestValidator.predicate("comment has body", comment.body.length > 0);
    TestValidator.predicate("comment has id", comment.id.length > 0);
    TestValidator.predicate(
      "comment has created_at",
      comment.created_at.length > 0,
    );
    TestValidator.predicate(
      "vote_score is number",
      typeof comment.vote_score === "number",
    );
    TestValidator.predicate(
      "reply_count is number",
      typeof comment.reply_count === "number",
    );
    TestValidator.equals("parent is null for top-level", comment.parent, null);
  }
  // 10. Verify comments are sorted by created_at DESC
  for (let i = 1; i < page1Response.data.length; i++) {
    const prevDate = new Date(page1Response.data[i - 1].created_at).getTime();
    const currDate = new Date(page1Response.data[i].created_at).getTime();
    TestValidator.predicate(
      `comment ${i} sorted DESC after comment ${i - 1}`,
      prevDate >= currDate,
    );
  }
  // 11. Member A retrieves member B's comment history - page 2
  const page2Response =
    await api.functional.redditClone.member.members.comments.index(
      memberAConnection,
      {
        memberId: memberB.id,
        body: {
          page: 2,
          limit: 20,
          sort: "new",
        } satisfies IRedditCloneComment.IRequest,
      },
    );
  typia.assert(page2Response);
  // 12. Verify page 2 contains remaining 5 comments
  TestValidator.equals("page 2 comment count", page2Response.data.length, 5);
  // 13. Verify pagination metadata for page 2
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 20);
  TestValidator.equals(
    "page 2 total records",
    page2Response.pagination.records,
    25,
  );
  TestValidator.equals("page 2 total pages", page2Response.pagination.pages, 2);
  // 14. Verify each comment on page 2 has required fields and correct author
  for (const comment of page2Response.data) {
    TestValidator.equals(
      "comment author is member B",
      comment.author.id,
      memberB.id,
    );
    TestValidator.equals("comment post matches", comment.post.id, post.id);
    TestValidator.predicate("comment has body", comment.body.length > 0);
    TestValidator.predicate("comment has id", comment.id.length > 0);
    TestValidator.predicate(
      "comment has created_at",
      comment.created_at.length > 0,
    );
    TestValidator.predicate(
      "vote_score is number",
      typeof comment.vote_score === "number",
    );
    TestValidator.predicate(
      "reply_count is number",
      typeof comment.reply_count === "number",
    );
    TestValidator.equals("parent is null for top-level", comment.parent, null);
  }
  // 15. Verify all 25 comments are unique across both pages
  const allCommentIds = [
    ...page1Response.data.map((c) => c.id),
    ...page2Response.data.map((c) => c.id),
  ];
  const uniqueCommentIds = new Set(allCommentIds);
  TestValidator.equals(
    "all comments are unique across pages",
    uniqueCommentIds.size,
    25,
  );
  // 16. Verify page 2 comments are also sorted by created_at DESC
  for (let i = 1; i < page2Response.data.length; i++) {
    const prevDate = new Date(page2Response.data[i - 1].created_at).getTime();
    const currDate = new Date(page2Response.data[i].created_at).getTime();
    TestValidator.predicate(
      `page 2 comment ${i} sorted DESC after comment ${i - 1}`,
      prevDate >= currDate,
    );
  }
}
