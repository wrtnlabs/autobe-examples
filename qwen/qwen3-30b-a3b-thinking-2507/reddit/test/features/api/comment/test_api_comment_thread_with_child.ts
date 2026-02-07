import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";

export async function test_api_comment_thread_with_child(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {} satisfies ICommunityPlatformMember.IJoin,
  });
  // 2. Create root comment (thread basis)
  const rootComment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: typia.random<string & tags.Format<"uuid">>() },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  // 3. Create child comment (reply to main comment)
  const childComment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: rootComment.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
          parent_id: rootComment.id,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  // 4. Retrieve the full thread
  const thread =
    await api.functional.communityPlatform.member.comments.thread.index(
      memberConnection,
      {
        commentId: rootComment.id,
      },
    );
  typia.assert(thread);
  // 5. Validate thread structure
  TestValidator.equals("thread has child", thread.children.length, 1);
  TestValidator.equals("thread root matches", thread.id, rootComment.id);
  TestValidator.equals(
    "child comment ID matches",
    thread.children[0].id,
    childComment.id,
  );
  TestValidator.predicate(
    "child should appear after parent",
    thread.children[0].created_at > thread.created_at,
  );
}
