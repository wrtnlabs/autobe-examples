import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { generate_random_community_platform_member_comments_replies_create } from "../../../generate/generate_random_community_platform_member_comments_replies_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_comment_reply_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Create a parent comment with approximately 100 characters
  // Using paragraph with 10 sentences of 8-10 words each
  const parentComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.replies.create(
      memberConnection,
      {
        commentId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          content: RandomGenerator.paragraph({
            sentences: 10,
            wordMin: 8,
            wordMax: 10,
          }), // Approximately 100 characters
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(parentComment);
  // Step 3: Create a reply to the parent comment with exactly 100 characters
  const reply: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.replies.create(
      memberConnection,
      {
        commentId: parentComment.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 8,
            wordMin: 9,
            wordMax: 10,
          }), // Approximately 100 characters
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(reply);
  // Step 4: Verify reply inherits parent_id from the parent comment
  TestValidator.equals(
    "reply parent_id matches parent comment",
    reply.parent_id,
    parentComment.id,
  );
}
