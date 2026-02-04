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
export async function test_api_reply_report_submission(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authenticatedMember: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 2: Create a parent comment with different member connection to ensure different author
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherAuthenticatedMember: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(otherMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  const parentComment: ICommunityPlatformComment =
    await generate_random_community_platform_member_comments_replies_create(
      otherMemberConnection,
      {
        body: {
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 8,
            sentenceMax: 12,
          }),
        } satisfies ICommunityPlatformComment.ICreate,
        params: {
          commentId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  // Step 3: Create a reply to the parent comment (created by other member)
  const reply: ICommunityPlatformComment =
    await generate_random_community_platform_member_comments_replies_create(
      otherMemberConnection,
      {
        body: {
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 8,
          }),
        } satisfies ICommunityPlatformComment.ICreate,
        params: {
          commentId: parentComment.id,
        },
      },
    );
  // Step 4: Submit a report on the reply (by memberConnection, not the creator)
  // The API contract requires an empty object for ICommunityPlatformCommentReport.IRequest
  // despite the scenario mentioning a reason text - this contradicts the DTO, so we follow the API
  const report: ICommunityPlatformCommentReport =
    await api.functional.communityPlatform.member.comments.replies.reports.create(
      memberConnection,
      {
        commentId: parentComment.id,
        replyId: reply.id,
        body: {} satisfies ICommunityPlatformCommentReport.IRequest,
      },
    );
  // Step 5: Validate the report object according to the API contract
  typia.assert(report);
  TestValidator.equals("report has a unique UUID", report.id.length > 0, true);
  TestValidator.equals(
    "reporter is an ISummary object",
    typeof report.reporter,
    "object",
  );
  TestValidator.equals(
    "reported comment is an ISummary object",
    typeof report.reportedComment,
    "object",
  );
}
