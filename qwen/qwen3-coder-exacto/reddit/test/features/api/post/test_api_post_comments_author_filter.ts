import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { ICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumPostComment";

export async function test_api_post_comments_author_filter(
  connection: api.IConnection,
) {
  // Step 1: Create first user (commenter 1)
  const user1Join = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
    username: RandomGenerator.name(1).replace(/\s/g, "_").toLowerCase() + "_1",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user1: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user1Join,
    });
  typia.assert(user1);

  // Step 2: Create second user (commenter 2)
  const user2Join = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
    username: RandomGenerator.name(1).replace(/\s/g, "_").toLowerCase() + "_2",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user2: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user2Join,
    });
  typia.assert(user2);

  // Step 3: Create community using first user
  const communityData = {
    name: RandomGenerator.name(2).replace(/\s/g, "-").toLowerCase(),
    slug:
      RandomGenerator.name(1).toLowerCase() +
      "-" +
      RandomGenerator.alphabets(5),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    privacy_level: "public" as const,
    status: "active" as const,
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 4: Create post using first user
  const postData = {
    community_forum_community_id: community.id,
    title: RandomGenerator.name(4),
    type: "text" as const,
    body: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 5: Create comment as first user
  const comment1Data = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    href: "http://test.com/post/" + post.id,
    referrer: "http://test.com/community/" + community.slug,
  } satisfies ICommunityForumPostComment.ICreate;

  // Switch to user1
  await api.functional.auth.user.join(connection, {
    body: user1Join,
  });

  const comment1: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: comment1Data,
    });
  typia.assert(comment1);

  // Step 6: Create comment as second user
  const comment2Data = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    href: "http://test.com/post/" + post.id,
    referrer: "http://test.com/community/" + community.slug,
  } satisfies ICommunityForumPostComment.ICreate;

  // Switch to user2
  await api.functional.auth.user.join(connection, {
    body: user2Join,
  });

  const comment2: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: comment2Data,
    });
  typia.assert(comment2);

  // Step 7: Create another comment as first user
  const comment3Data = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    href: "http://test.com/post/" + post.id,
    referrer: "http://test.com/community/" + community.slug,
  } satisfies ICommunityForumPostComment.ICreate;

  // Switch back to user1
  await api.functional.auth.user.join(connection, {
    body: user1Join,
  });

  const comment3: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: comment3Data,
    });
  typia.assert(comment3);

  // Step 8: Test filtering by author username (user1)
  const user1Comments: IPageICommunityForumPostComment =
    await api.functional.communityForum.posts.comments.index(connection, {
      postId: post.id,
      body: {
        author: user1.username,
      },
    });
  typia.assert(user1Comments);

  // Should contain only comments from user1
  TestValidator.equals(
    "filtered comments should only contain user1's comments",
    user1Comments.data.length,
    2,
  );

  TestValidator.predicate(
    "all filtered comments should be from user1",
    user1Comments.data.every(
      (comment) => comment.community_forum_user_id === user1.id,
    ),
  );

  // Step 9: Test filtering by author username (user2)
  const user2Comments: IPageICommunityForumPostComment =
    await api.functional.communityForum.posts.comments.index(connection, {
      postId: post.id,
      body: {
        author: user2.username,
      },
    });
  typia.assert(user2Comments);

  // Should contain only comments from user2
  TestValidator.equals(
    "filtered comments should only contain user2's comments",
    user2Comments.data.length,
    1,
  );

  TestValidator.predicate(
    "all filtered comments should be from user2",
    user2Comments.data.every(
      (comment) => comment.community_forum_user_id === user2.id,
    ),
  );

  // Step 10: Test with non-existent author (should return empty)
  const emptyComments: IPageICommunityForumPostComment =
    await api.functional.communityForum.posts.comments.index(connection, {
      postId: post.id,
      body: {
        author: "non_existent_user_12345",
      },
    });
  typia.assert(emptyComments);

  TestValidator.equals(
    "no comments should be returned for non-existent author",
    emptyComments.data.length,
    0,
  );
}
