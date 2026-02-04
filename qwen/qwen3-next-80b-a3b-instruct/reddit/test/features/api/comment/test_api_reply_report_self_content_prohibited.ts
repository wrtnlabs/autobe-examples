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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_reply_report_self_content_prohibited(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Generate random commentId and replyId that will be used for reporting
  const commentId: string = typia.random<string & tags.Format<"uuid">>();
  const replyId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Verify that the member cannot report their own reply
  // The server should detect that this member is attempting to report their own content
  // based on JWT authentication context and the reply ownership
  await TestValidator.error("cannot report own content", async () => {
    await api.functional.communityPlatform.member.comments.replies.reports.create(
      memberConnection,
      {
        commentId,
        replyId,
        body: {} satisfies ICommunityPlatformCommentReport.IRequest,
      },
    );
  });
}
