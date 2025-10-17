import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_post_creation_permission_validation(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminData = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Admin creates community with moderators_only posting permission
  const communityData = {
    code: RandomGenerator.alphabets(15),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    posting_permission: "moderators_only",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  TestValidator.equals(
    "community posting permission should be moderators_only",
    community.posting_permission,
    "moderators_only",
  );

  // Step 3: Create a separate connection for regular member account
  const memberConnection: api.IConnection = { ...connection, headers: {} };

  const memberData = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(memberConnection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 4: Member subscribes to the community
  const subscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);

  TestValidator.equals(
    "subscription community ID should match",
    subscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "subscription member ID should match",
    subscription.member_id,
    member.id,
  );

  // Step 5: Member attempts to create a post (should fail due to permissions)
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  await TestValidator.error(
    "regular member should not be able to post in moderators_only community",
    async () => {
      await api.functional.redditLike.member.posts.create(memberConnection, {
        body: postData,
      });
    },
  );

  // Step 6: Admin assigns member as moderator
  const moderatorAssignment: IRedditLikeCommunityModerator =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: member.id,
          permissions: "manage_posts,manage_comments",
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  TestValidator.equals(
    "moderator assignment community ID should match",
    moderatorAssignment.community_id,
    community.id,
  );
  TestValidator.equals(
    "moderator assignment member ID should match",
    moderatorAssignment.moderator_id,
    member.id,
  );

  // Step 7: Member retries creating post (should succeed with moderator status)
  const createdPost: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(memberConnection, {
      body: postData,
    });
  typia.assert(createdPost);

  // Step 8: Verify the post was created successfully
  TestValidator.equals(
    "created post type should match",
    createdPost.type,
    "text",
  );
  TestValidator.equals(
    "created post title should match",
    createdPost.title,
    postData.title,
  );
}
