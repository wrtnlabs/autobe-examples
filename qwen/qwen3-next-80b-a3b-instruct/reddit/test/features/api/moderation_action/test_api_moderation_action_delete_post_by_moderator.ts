import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_community_moderator_moderation_actions_create } from "../../../generate/generate_random_reddit_community_community_moderator_moderation_actions_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_moderation_action_of_post } from "../../../prepare/prepare_random_reddit_community_moderation_action_of_post";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_moderation_action_delete_post_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a community moderator account
  const modConnection: api.IConnection = { host: connection.host };
  const passwordHash = RandomGenerator.alphaNumeric(64);
  const modData = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: passwordHash
  } satisfies IRedditCommunityCommunityModerator.IJoin;
  const modAuth = await authorize_community_moderator_join(modConnection, {
    body: modData,
  });
  // 2. Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: memberPassword
  } satisfies IRedditCommunityMember.IJoin;
  await authorize_member_join(memberConnection, { body: memberData });
  // 3. Log in as member to create a post
  const memberLogin = await authorize_member_login(memberConnection, {
    body: {
      email: memberData.email,
      password: memberPassword,
    } satisfies IRedditCommunityMember.ILogin,
  });
  // 4. Create a post in a community
  const postContent = {
    title: RandomGenerator.name(),
    communityName: RandomGenerator.alphabets(8),
    textContent: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditCommunityPost.ICreate;
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    { body: postContent },
  );
  typia.assert(post);
  // 5. Log in as community moderator
  const modLogin = await authorize_community_moderator_login(modConnection, {
    body: {
      email: modData.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });
  // 6. Submit delete moderation action on post using utility function
  const moderationAction = {
    target_type: "post" as const,
    action_type: "delete" as const,
    reason: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 20,
    }),
  } satisfies IRedditCommunityModerationActionOfPost.ICreate;
  await generate_random_reddit_community_community_moderator_moderation_actions_create(
    modConnection,
    { body: moderationAction },
  );
  // Verification: Success is indicated by absence of error, no action body to validate
}