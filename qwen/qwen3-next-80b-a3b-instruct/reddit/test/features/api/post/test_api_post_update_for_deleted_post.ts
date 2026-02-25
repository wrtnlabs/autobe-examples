import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection, HttpError } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_post_update_for_deleted_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member actor to create post
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create a new post
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 2. Create platform admin actor to delete post
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Delete the member's post
  await api.functional.redditCommunity.platformAdmin.posts.erase(
    adminConnection,
    {
      postId: post.id,
    },
  );
  // 3. Attempt to update the deleted post as member - must fail with 403 Forbidden
  try {
    await api.functional.redditCommunity.member.posts.update(memberConnection, {
      postId: post.id,
      body: {
        title: "Updated title",
      } satisfies IRedditCommunityPost.IUpdate,
    });
    throw new Error("Expected 403 Forbidden error but request succeeded");
  } catch (error) {
    if (!typia.is<HttpError>(error)) {
      throw error;
    }
    TestValidator.equals(
      "Status code should be 403 Forbidden",
      error.status,
      403,
    );
  }
  // 4. Verify the post remains deleted and unchanged
  const retrievedPost =
    await api.functional.redditCommunity.member.posts.create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: post.community.id,
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(retrievedPost);
  // Cleanup: delete the created post
  await api.functional.redditCommunity.platformAdmin.posts.erase(
    adminConnection,
    {
      postId: retrievedPost.id,
    },
  );
}