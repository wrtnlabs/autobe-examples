import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
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
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_comment_update_blocked_when_post_locked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create platform admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  // 2. Create member actor for the post owner
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 3. Login as member to create a post
  const memberLoginConnection: api.IConnection = { host: connection.host };
  const authHeader = memberConnection.headers?.Authorization;
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: (authHeader !== null && authHeader !== undefined) ? (authHeader as string).replace("Bearer ", "") : "",
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityMember.ILogin,
  });
  // 4. Create a post and obtain its ID
  const post = await api.functional.redditCommunity.member.posts.create(
    memberLoginConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Lock the post by permanently deleting it (this sets is_locked = true)
  await api.functional.redditCommunity.platformAdmin.posts.erase(
    adminConnection,
    {
      postId: post.id,
    },
  );
  // 6. Generate a random commentId to test update on locked post
  // We assume a comment exists on the post, even though no creation API exists
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 7. Attempt to update the comment as platformAdmin - should be blocked with 403
  await TestValidator.httpError(
    "comment update should be blocked on locked post",
    403,
    async () => {
      const updateResponse =
        await api.functional.redditCommunity.platformAdmin.posts.comments.update(
          adminConnection,
          {
            postId: post.id,
            commentId: commentId,
            body: {
              content: RandomGenerator.paragraph({ sentences: 2 }),
            } satisfies IRedditCommunityComment.IUpdate,
          },
        );
      typia.assert(updateResponse);
    },
  );
}