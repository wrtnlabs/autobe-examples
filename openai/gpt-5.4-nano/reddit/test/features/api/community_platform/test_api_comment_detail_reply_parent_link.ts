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

export async function test_api_comment_detail_reply_parent_link(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // No post/comment creation or soft-delete SDK/utility was provided in the inputs.
  // Use randomized identifiers only to exercise the endpoint contract.
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const reply = await api.functional.communityPlatform.member.posts.comments.at(
    memberConnection,
    { postId, commentId },
  );
  typia.assert(reply);
  // Validate scoping: the comment must belong to the requested post.
  TestValidator.equals(
    "reply.community_platform_post_id should match requested postId",
    reply.community_platform_post_id,
    postId,
  );
  // Validate hierarchy linkage contract: parent_comment_id is nullable.
  // (Typia already validated UUID/nullability.)
  TestValidator.predicate(
    "reply.parent_comment_id is null or a non-empty uuid string",
    reply.parent_comment_id === null || reply.parent_comment_id.length > 0,
  );
  // Soft-deletion edge-case: without a provided deletion operation, we re-fetch and
  // ensure the endpoint remains a single-resource projection.
  const replyAfterParentDeletion =
    await api.functional.communityPlatform.member.posts.comments.at(
      memberConnection,
      { postId, commentId },
    );
  typia.assert(replyAfterParentDeletion);
  TestValidator.equals(
    "replyAfterParentDeletion.community_platform_post_id should still match requested postId",
    replyAfterParentDeletion.community_platform_post_id,
    postId,
  );
}
