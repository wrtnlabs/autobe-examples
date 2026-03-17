import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePostSnapshot";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImage";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostSnapshot";
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
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_post_image } from "../../../prepare/prepare_random_reddit_like_post_image";

export async function test_api_post_snapshot_edit_history_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "-"),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
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
  // 4. Create an initial post (text type for easier editing)
  const initialPost = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Initial Post Title",
        community_id: community.id,
        post_type: "text",
        body: "Initial post content body for snapshot testing",
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(initialPost);
  // 5. Edit the post multiple times to create snapshots
  const edit1 = await api.functional.redditLike.member.posts.update(
    memberConnection,
    {
      postId: initialPost.id,
      body: {
        title: "Updated Title 1",
        body: "Updated content after first edit",
      } satisfies IRedditLikePost.IUpdate,
    },
  );
  typia.assert(edit1);
  const edit2 = await api.functional.redditLike.member.posts.update(
    memberConnection,
    {
      postId: initialPost.id,
      body: {
        title: "Updated Title 2",
        body: "Updated content after second edit",
      } satisfies IRedditLikePost.IUpdate,
    },
  );
  typia.assert(edit2);
  const edit3 = await api.functional.redditLike.member.posts.update(
    memberConnection,
    {
      postId: initialPost.id,
      body: {
        title: "Final Updated Title",
        body: "Final updated content after third edit",
      } satisfies IRedditLikePost.IUpdate,
    },
  );
  typia.assert(edit3);
  // 6. Fetch snapshots with default pagination (descending order - newest first)
  const snapshotsPage = await api.functional.redditLike.posts.snapshots.index(
    memberConnection,
    {
      postId: initialPost.id,
      body: {
        page: 1,
        limit: 10,
        sort: "created_at",
        order: "desc",
      } satisfies IRedditLikePostSnapshot.IRequest,
    },
  );
  typia.assert(snapshotsPage);
  // 7. Validate snapshot results
  TestValidator.predicate("snapshots exist", snapshotsPage.data.length >= 3);
  TestValidator.equals(
    "pagination current page",
    snapshotsPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", snapshotsPage.pagination.limit, 10);
  TestValidator.predicate(
    "total records tracked",
    snapshotsPage.pagination.records >= 3,
  );
  // Validate snapshot structure and content
  for (const snapshot of snapshotsPage.data) {
    TestValidator.equals(
      "snapshot post reference matches",
      snapshot.post.id,
      initialPost.id,
    );
    TestValidator.equals(
      "snapshot author matches",
      snapshot.author.id,
      member.id,
    );
    TestValidator.predicate(
      "snapshot has valid title",
      snapshot.title.length > 0,
    );
    TestValidator.predicate(
      "snapshot has valid content type",
      ["text", "link", "image"].includes(snapshot.contentType),
    );
    TestValidator.predicate(
      "snapshot has created timestamp",
      snapshot.createdAt.length > 0,
    );
  }
  // 8. Test pagination with smaller limit
  const paginatedResult = await api.functional.redditLike.posts.snapshots.index(
    memberConnection,
    {
      postId: initialPost.id,
      body: {
        page: 1,
        limit: 2,
        sort: "created_at",
        order: "desc",
      } satisfies IRedditLikePostSnapshot.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination respects limit",
    paginatedResult.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination calculates total pages",
    paginatedResult.pagination.pages >= 2,
  );
  // 9. Test ascending order (oldest first)
  const ascendingResult = await api.functional.redditLike.posts.snapshots.index(
    memberConnection,
    {
      postId: initialPost.id,
      body: {
        page: 1,
        limit: 10,
        sort: "created_at",
        order: "asc",
      } satisfies IRedditLikePostSnapshot.IRequest,
    },
  );
  typia.assert(ascendingResult);
  // Verify ascending order - timestamps should increase
  if (ascendingResult.data.length >= 2) {
    const firstTime = new Date(ascendingResult.data[0].createdAt).getTime();
    const lastTime = new Date(
      ascendingResult.data[ascendingResult.data.length - 1].createdAt,
    ).getTime();
    TestValidator.predicate(
      "ascending order is correct (oldest first)",
      firstTime <= lastTime,
    );
  }
  // 10. Validate descending order (newest first) - the default
  if (snapshotsPage.data.length >= 2) {
    const firstTime = new Date(snapshotsPage.data[0].createdAt).getTime();
    const lastTime = new Date(
      snapshotsPage.data[snapshotsPage.data.length - 1].createdAt,
    ).getTime();
    TestValidator.predicate(
      "descending order is correct (newest first)",
      firstTime >= lastTime,
    );
  }
}
