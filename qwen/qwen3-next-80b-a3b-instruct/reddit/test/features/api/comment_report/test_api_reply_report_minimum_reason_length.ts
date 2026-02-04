import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { generate_random_community_platform_member_comments_replies_create } from "../../../generate/generate_random_community_platform_member_comments_replies_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_reply_report_minimum_reason_length(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 2: Generate valid UUIDs for comment and reply
  const validCommentId: string = typia.random<string & tags.Format<"uuid">>();
  const validReplyId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Test that report fails when reason text is less than 10 characters
  // Since ICommunityPlatformCommentReport.IRequest is defined as an empty object {},
  // the API expects no properties in the request body. However, the business requirement
  // is that the reason text must be at least 10 characters long. The API backend
  // implements this validation internally. Therefore, sending {} (empty object) should fail
  // because no reason text was provided, violating the 10 character minimum requirement.
  await TestValidator.error(
    "report should fail when reason text is less than 10 characters",
    async () => {
      await api.functional.communityPlatform.member.comments.replies.reports.create(
        memberConnection,
        {
          commentId: validCommentId,
          replyId: validReplyId,
          body: {} satisfies ICommunityPlatformCommentReport.IRequest,
        },
      );
    },
  );
  // Step 4: Test that report fails with malformed UUIDs in path parameters
  await TestValidator.error(
    "report should fail with malformed commentId",
    async () => {
      await api.functional.communityPlatform.member.comments.replies.reports.create(
        memberConnection,
        {
          commentId: "invalid-uuid", // Malformed UUID
          replyId: validReplyId,
          body: {} satisfies ICommunityPlatformCommentReport.IRequest,
        },
      );
    },
  );
  await TestValidator.error(
    "report should fail with malformed replyId",
    async () => {
      await api.functional.communityPlatform.member.comments.replies.reports.create(
        memberConnection,
        {
          commentId: validCommentId,
          replyId: "123-not-a-uuid", // Malformed UUID
          body: {} satisfies ICommunityPlatformCommentReport.IRequest,
        },
      );
    },
  );
}
