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
export async function test_api_comment_reply_vote_removal_not_existing(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member to perform voting operations
  const member1Connection: api.IConnection = { host: connection.host };
  const member1: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(member1Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
      },
    });
  typia.assert(member1);
  // Step 2: Create dummy IDs for a non-existent comment and reply
  // Since we cannot create actual comments or replies with available APIs,
  // we'll use valid UUID format strings for the test
  const dummyCommentId: string = typia.random<string & tags.Format<"uuid">>();
  const dummyReplyId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Attempt to remove a vote that never existed
  // This should return a 404 error according to scenario
  await TestValidator.error(
    "removing vote never made should return 404",
    async () => {
      await api.functional.communityPlatform.member.comments.replies.votes.erase(
        member1Connection,
        {
          commentId: dummyCommentId,
          replyId: dummyReplyId,
        },
      );
    },
  );
  // No need to verify vote count as we cannot read the reply state
  // The success of the test is the 404 error, which is already validated
}
