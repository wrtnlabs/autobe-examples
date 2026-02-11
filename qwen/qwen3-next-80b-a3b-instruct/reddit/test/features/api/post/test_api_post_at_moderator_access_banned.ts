import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerationActionOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationActionOfPost";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";
import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_community_owner_communities_create } from "../../../generate/generate_random_reddit_community_community_owner_communities_create";
import { generate_random_reddit_community_community_owner_moderation_actions_create } from "../../../generate/generate_random_reddit_community_community_owner_moderation_actions_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_moderation_action_of_post } from "../../../prepare/prepare_random_reddit_community_moderation_action_of_post";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_post_at_moderator_access_banned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community owner and create community
  const ownerConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  } as api.IConnection;
  const ownerJoinResult = await authorize_community_owner_join(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IRedditCommunityCommunityOwner.IJoin,
    },
  );
  ownerConnection.headers!.Authorization = `Bearer ${ownerJoinResult.token.access}`;
  const community =
    await generate_random_reddit_community_community_owner_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 2. Authenticate as member and create post in community
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  } as api.IConnection;
  const memberJoinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityMember.IJoin,
  });
  memberConnection.headers!.Authorization = `Bearer ${memberJoinResult.token.access}`;
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        communityName: community.name,
        textContent: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Authenticate as community owner and ban the post
  const moderationActionBody: IRedditCommunityModerationActionOfPost.ICreate = {
    target_type: "post",
    action_type: "delete",
    reason: RandomGenerator.paragraph({ sentences: 1 }),
  };
  await api.functional.redditCommunity.communityOwner.moderation_actions.create(
    ownerConnection,
    {
      body: moderationActionBody,
    },
  );
  // Retrieve post again to confirm status is 'banned'
  const confirmedPost = await api.functional.redditCommunity.posts.at(
    ownerConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(confirmedPost);
  TestValidator.equals(
    "post status should be banned after moderation",
    confirmedPost.status,
    "banned",
  );
  // 4. Authenticate as community moderator and access the banned post
  const moderatorConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  } as api.IConnection;
  // Generate email before joining
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorJoinResult = await authorize_community_moderator_join(
    moderatorConnection,
    {
      body: {
        email: moderatorEmail,
        password_hash: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IRedditCommunityCommunityModerator.IJoin,
    },
  );
  moderatorConnection.headers!.Authorization = `Bearer ${moderatorJoinResult.token.access}`;
  // Use generated email for login, not join result body
  const moderatorLoginResult = await authorize_community_moderator_login(
    moderatorConnection,
    {
      body: {
        email: moderatorEmail, // Fixed: use generated email, not non-existent body property
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    },
  );
  moderatorConnection.headers!.Authorization = `Bearer ${moderatorLoginResult.token.access}`;
  // Retrieve the post as moderator - should succeed with status 'banned'
  const retrievedPost = await api.functional.redditCommunity.posts.at(
    moderatorConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(retrievedPost);
  TestValidator.equals(
    "post status should be banned",
    retrievedPost.status,
    "banned",
  );
  TestValidator.equals("post id should match", retrievedPost.id, post.id);
  TestValidator.equals(
    "post title should match",
    retrievedPost.title,
    post.title,
  );
  TestValidator.equals(
    "post community name should match",
    retrievedPost.community.name,
    community.name,
  );
  TestValidator.predicate(
    "post karma score should be valid",
    retrievedPost.karma_score >= 0,
  );
  // Verify that a regular user cannot access the banned post
  const regularUserConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  } as api.IConnection;
  const regularUserJoinResult = await authorize_member_join(
    regularUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IRedditCommunityMember.IJoin,
    },
  );
  regularUserConnection.headers!.Authorization = `Bearer ${regularUserJoinResult.token.access}`;
  await TestValidator.httpError(
    "regular user should not be able to access banned post",
    403,
    async () => {
      await api.functional.redditCommunity.posts.at(regularUserConnection, {
        postId: post.id,
      });
    },
  );
}
