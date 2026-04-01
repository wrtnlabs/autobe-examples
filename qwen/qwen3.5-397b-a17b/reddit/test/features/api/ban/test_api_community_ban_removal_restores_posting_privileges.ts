import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_bans_create } from "../../../generate/generate_random_reddit_community_member_communities_bans_create";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_ban } from "../../../prepare/prepare_random_reddit_community_ban";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test that removing a ban immediately restores the user's ability to create posts in the community.
 *
 * This test validates the complete ban lifecycle:
 * 1. Community owner creates a community
 * 2. Another member is banned from the community
 * 3. Banned user cannot create posts (verified)
 * 4. Owner removes the ban
 * 5. Previously banned user can now create posts
 */
export async function test_api_community_ban_removal_restores_posting_privileges(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create member account who will be banned
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(bannedMemberAuth);
  // 4. Ban the member from the community
  const ban =
    await generate_random_reddit_community_member_communities_bans_create(
      ownerConnection,
      {
        body: {
          reddit_community_member_id: bannedMemberAuth.id,
          reason: "Testing ban removal functionality",
        },
        params: {
          communityName: community.name,
        },
      },
    );
  typia.assert(ban);
  // 5. Verify banned user cannot create posts (should fail)
  await TestValidator.error("banned user cannot create posts", async () => {
    await api.functional.redditCommunity.member.posts.create(
      bannedMemberConnection,
      {
        body: {
          post_type: "text",
          title: RandomGenerator.paragraph({ sentences: 1 }),
          text_content: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  });
  // 6. Remove the ban using the unban endpoint
  await api.functional.redditCommunity.member.communities.bans.erase(
    ownerConnection,
    {
      communityName: community.name,
      userId: bannedMemberAuth.id,
    },
  );
  // 7. Prepare post data for creation after unban
  const postTitle = RandomGenerator.paragraph({ sentences: 1 });
  const postContent = RandomGenerator.content({ paragraphs: 2 });
  // 8. Verify unbanned user can now create posts
  const post = await api.functional.redditCommunity.member.posts.create(
    bannedMemberConnection,
    {
      body: {
        post_type: "text",
        title: postTitle,
        text_content: postContent,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 9. Validate post was created successfully with correct data
  TestValidator.equals("post title matches input", post.title, postTitle);
  TestValidator.equals(
    "post author is unbanned user",
    post.author.id,
    bannedMemberAuth.id,
  );
  TestValidator.equals(
    "post community matches",
    post.community.id,
    community.id,
  );
  TestValidator.predicate("post has valid score", post.vote_score >= 0);
  TestValidator.predicate("post was created", post.created_at !== null);
}
