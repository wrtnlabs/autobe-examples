import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_post_deletion_by_platform_admin(
  connection: api.IConnection,
): Promise<void> {
  // Generate a static password for platform admin and member
  const password = RandomGenerator.alphaNumeric(16);
  // 1. Create platform admin account
  const platformAdminConnection: api.IConnection = { host: connection.host };
  const platformAdmin = await authorize_platform_admin_join(
    platformAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: password,
        username: RandomGenerator.name(1),
      },
    },
  );
  // 2. Create member account to create post
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
      username: RandomGenerator.name(1),
    },
  });
  // 3. Create community as member
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  // 4. Create post as member
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1, wordMax: 5 }),
        community_id: community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Switch to platform admin context using known password
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_platform_admin_login(adminConnection, {
    body: {
      email: platformAdmin.email,
      password: password,
    },
  });
  // 6. Delete the post as platform admin
  await api.functional.redditCommunity.platformAdmin.posts.erase(
    adminConnection,
    {
      postId: post.id,
    },
  );
  // Note: We cannot validate the deletion outcome because:
  // - API SDK does not provide a GET /posts/{postId} endpoint
  // - We cannot verify the post is marked is_deleted=true
  // - We cannot verify the post returns 404
  // - We cannot verify community post count decrease
  // This test only verifies the platform admin can successfully call the erase operation
  // and the operation does not throw an error.
  // This is insufficient for full scenario verification due to API limitations.
}
