import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
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
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_owner_comment_sorted_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {});
  // 2. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 3. Member creates a community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 4. Member subscribes to the community
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberConnection,
    { communityId: community.id },
  );
  // 5. Member creates a post
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: "Test Post for Comment Pagination",
        post_type: "text",
        body: "This post is created to test comment pagination functionality.",
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Create 25 comments to trigger pagination
  const commentCount = 25;
  await ArrayUtil.asyncRepeat(commentCount, async () => {
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  });
  // 7. Owner retrieves page 1 (sort=NEW, page=1, limit=10)
  const page1 =
    await api.functional.redditLike.owner.posts.comments.sorted.index(
      ownerConnection,
      {
        postId: post.id,
        body: {
          sort: "NEW",
          page: 1,
          limit: 10,
          search: null,
          authorId: null,
          parentId: null,
          includeDeleted: false,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(page1);
  // 8. Owner retrieves page 2 (sort=NEW, page=2, limit=10)
  const page2 =
    await api.functional.redditLike.owner.posts.comments.sorted.index(
      ownerConnection,
      {
        postId: post.id,
        body: {
          sort: "NEW",
          page: 2,
          limit: 10,
          search: null,
          authorId: null,
          parentId: null,
          includeDeleted: false,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(page2);
  // 9. Validate pagination metadata for page 1
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.equals(
    "page 1 total records",
    page1.pagination.records,
    commentCount,
  );
  TestValidator.equals("page 1 total pages", page1.pagination.pages, 3);
  // Validate pagination metadata for page 2
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
  TestValidator.equals(
    "page 2 total records",
    page2.pagination.records,
    commentCount,
  );
  TestValidator.equals("page 2 total pages", page2.pagination.pages, 3);
  // 10. Validate no overlap between pages
  const page1Ids = new Set(page1.data.map((c) => c.id));
  const page2Ids = new Set(page2.data.map((c) => c.id));
  TestValidator.predicate("page 1 has 10 items", page1.data.length === 10);
  TestValidator.predicate("page 2 has 10 items", page2.data.length === 10);
  // Ensure no overlapping comment IDs between pages
  for (const id of page2Ids) {
    TestValidator.predicate(
      `comment ${id} from page 2 not in page 1`,
      !page1Ids.has(id),
    );
  }
}
