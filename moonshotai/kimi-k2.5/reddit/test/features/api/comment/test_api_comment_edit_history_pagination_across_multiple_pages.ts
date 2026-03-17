import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommentSnapshot";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentSnapshot";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_comment_edit_history_pagination_across_multiple_pages(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(16) + "A1!",
    },
  });
  typia.assert(member);
  // 2. Create a community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Create a post
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Create a comment
  const comment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 6. Get first page (limit=10, page=1)
  const page1Result = await api.functional.redditLike.comments.snapshots.index(
    memberConnection,
    {
      commentId: comment.id,
      body: { limit: 10, page: 1 },
    },
  );
  typia.assert(page1Result);
  // 7. Validate page 1 pagination structure
  TestValidator.equals(
    "page 1 limit matches request",
    page1Result.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 1 current is 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.predicate(
    "page 1 data count <= limit",
    page1Result.data.length <= 10,
  );
  // Verify ordering - newest first when sorted by created_at desc
  if (page1Result.data.length > 1) {
    for (let i = 1; i < page1Result.data.length; i++) {
      const currentDate = new Date(page1Result.data[i].createdAt).getTime();
      const previousDate = new Date(
        page1Result.data[i - 1].createdAt,
      ).getTime();
      TestValidator.predicate(
        "page 1 snapshots ordered by created_at desc",
        currentDate <= previousDate,
      );
    }
  }
  // Check if there are more pages
  if (page1Result.pagination.pages > 1) {
    // 8. Get second page (limit=10, page=2)
    const page2Result =
      await api.functional.redditLike.comments.snapshots.index(
        memberConnection,
        {
          commentId: comment.id,
          body: { limit: 10, page: 2 },
        },
      );
    typia.assert(page2Result);
    // 9. Validate page 2
    TestValidator.equals(
      "page 2 limit matches request",
      page2Result.pagination.limit,
      10,
    );
    TestValidator.equals(
      "page 2 current is 2",
      page2Result.pagination.current,
      2,
    );
    TestValidator.predicate(
      "page 2 data count <= limit",
      page2Result.data.length <= 10,
    );
    TestValidator.equals(
      "page 2 total records matches page 1",
      page2Result.pagination.records,
      page1Result.pagination.records,
    );
    TestValidator.equals(
      "page 2 total pages matches page 1",
      page2Result.pagination.pages,
      page1Result.pagination.pages,
    );
    // Verify ordering
    if (page2Result.data.length > 1) {
      for (let i = 1; i < page2Result.data.length; i++) {
        const currentDate = new Date(page2Result.data[i].createdAt).getTime();
        const previousDate = new Date(
          page2Result.data[i - 1].createdAt,
        ).getTime();
        TestValidator.predicate(
          "page 2 snapshots ordered by created_at desc",
          currentDate <= previousDate,
        );
      }
    }
    // Verify no overlap between page 1 and page 2
    const page1Ids = new Set(page1Result.data.map((s) => s.id));
    const hasOverlap = page2Result.data.some((s) => page1Ids.has(s.id));
    TestValidator.predicate("no duplicate snapshots across pages", !hasOverlap);
    // Verify second page items are older than first page (last item of page 1 vs first of page 2)
    if (page1Result.data.length > 0 && page2Result.data.length > 0) {
      const page1LastDate = new Date(
        page1Result.data[page1Result.data.length - 1].createdAt,
      ).getTime();
      const page2FirstDate = new Date(page2Result.data[0].createdAt).getTime();
      TestValidator.predicate(
        "page 2 items are older than page 1",
        page2FirstDate <= page1LastDate,
      );
    }
    // 10. Get final page if there are only 3 pages
    if (page2Result.pagination.pages >= 3) {
      const page3Result =
        await api.functional.redditLike.comments.snapshots.index(
          memberConnection,
          {
            commentId: comment.id,
            body: { limit: 10, page: 3 },
          },
        );
      typia.assert(page3Result);
      // Validate final page has correct current
      TestValidator.equals(
        "final page current is 3",
        page3Result.pagination.current,
        3,
      );
      // Final page may have fewer items
      TestValidator.predicate(
        "final page data count valid",
        page3Result.data.length > 0 && page3Result.data.length <= 10,
      );
    }
  }
  // Verify total count consistency
  TestValidator.predicate(
    "total records non-negative",
    page1Result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    page1Result.pagination.pages ===
      Math.ceil(page1Result.pagination.records / 10) ||
      page1Result.pagination.pages === 0,
  );
}
