import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_thread_excluding_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: typia.random<ICommunityPlatformMember.IJoin>(),
  });
  // 2. Create a post
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content_type: RandomGenerator.pick(["text", "link", "image"]),
        community_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(post);
  // 3. Create root comment for the thread
  const rootComment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        body: { content: RandomGenerator.paragraph({ sentences: 1 }) },
        params: { postId: post.id },
      },
    );
  typia.assert(rootComment);
  // 4. Create child comment
  const childComment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
          parent_id: rootComment.id,
        },
        params: { postId: post.id },
      },
    );
  typia.assert(childComment);
  // 5. Soft-delete the child comment
  await api.functional.communityPlatform.member.posts.comments.erase(
    memberConnection,
    {
      postId: post.id,
      commentId: childComment.id,
    },
  );
  // 6. Retrieve the thread (should exclude the soft-deleted comment)
  const thread =
    await api.functional.communityPlatform.member.comments.thread.index(
      memberConnection,
      {
        commentId: rootComment.id,
      },
    );
  typia.assert(thread);
  // 7. Validate: The thread should only contain the root comment
  TestValidator.equals(
    "thread should contain only the root comment",
    (thread.children || []).length,
    0,
  );
}
