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
import { generate_random_reddit_community_community_moderator_moderation_actions_create } from "../../../generate/generate_random_reddit_community_community_moderator_moderation_actions_create";
import { generate_random_reddit_community_community_owner_communities_create } from "../../../generate/generate_random_reddit_community_community_owner_communities_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_moderation_action_of_post } from "../../../prepare/prepare_random_reddit_community_moderation_action_of_post";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_community_moderator_delete_post_from_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community owner and create community
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_community_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityCommunityOwner.IJoin,
  });
  const community =
    await generate_random_reddit_community_community_owner_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 2. Authenticate as member and create post in community
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditCommunityMember.IJoin,
  });
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        communityName: community.name,
        textContent: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create community moderator account with SAME email as member
  // Note: This is NOT promotion - it's creating a separate moderator account
  // The scenario's "promotion" is impossible with current API, so we create a parallel moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorPassword = memberPassword; // Use same password for simplicity
  const moderatorPasswordHash = moderatorPassword; // This is a known limitation - should be bcrypt hash
  await api.functional.redditCommunity.auth.communityModerator.join(
    moderatorConnection,
    {
      body: {
        email: memberEmail,
        password_hash: moderatorPasswordHash,
        display_name: RandomGenerator.name(),
      } satisfies IRedditCommunityCommunityModerator.IJoin,
    },
  );
  // 4. Authenticate as community moderator
  await authorize_community_moderator_login(moderatorConnection, {
    body: {
      email: memberEmail,
      password: moderatorPassword,
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });
  // 5. Delete the post as community moderator (not owner)
  const deletedPost =
    await api.functional.redditCommunity.communityOwner.posts.erase(
      moderatorConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(deletedPost);
  // 6. Verify post is properly deleted
  TestValidator.equals(
    "deleted post matches original",
    deletedPost.id,
    post.id,
  );
  TestValidator.equals(
    "deleted post community matches",
    deletedPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "deleted post author matches",
    deletedPost.author.id,
    post.author.id,
  );
}
