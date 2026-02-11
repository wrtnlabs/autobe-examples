import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
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
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_post_deletion_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = RandomGenerator.alphaNumeric(16);
  const owner = await authorize_community_owner_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
    },
  });
  // 2. Login as community owner to create community
  await authorize_community_owner_login(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
    },
  });
  // 3. Create a community
  const community =
    await generate_random_reddit_community_community_owner_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: undefined,
        },
      },
    );
  typia.assert(community);
  // 4. Create community moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderator = await authorize_community_moderator_join(
    moderatorConnection,
    {
      body: {
        email: moderatorEmail,
        password_hash: moderatorPassword, // Use plain password as hash for test purposes
      },
    },
  );
  // 5. Login as community moderator
  await authorize_community_moderator_login(moderatorConnection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword, // Use same plain password
    },
  });
  // 6. Create member account to post
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  });
  // 7. Login as member
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  });
  // 8. Create a post in the community as member
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        communityName: community.name,
        textContent: RandomGenerator.content({ paragraphs: 1 }),
        url: undefined,
        imageUrl: undefined,
      },
    },
  );
  typia.assert(post);
  // 9. As moderator, delete the post created by member
  const deletedPost =
    await api.functional.redditCommunity.communityModerator.posts.erase(
      moderatorConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(deletedPost);
  // 10. Validate that the returned post matches the original
  TestValidator.equals(
    "deleted post matches original",
    deletedPost.id,
    post.id,
  );
  TestValidator.equals(
    "deleted post title matches",
    deletedPost.title,
    post.title,
  );
  TestValidator.equals(
    "deleted post community matches",
    deletedPost.community.id,
    post.community.id,
  );
  TestValidator.equals(
    "deleted post author matches",
    deletedPost.author.id,
    post.author.id,
  );
  TestValidator.equals(
    "deleted post content matches",
    deletedPost.content,
    post.content,
  );
}
