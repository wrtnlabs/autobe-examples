import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member without moderator privileges cannot view reports.
 *
 * Validates that the report access control mechanism correctly restricts access to moderators
 * with privileges in the target community. Even members who submitted a report cannot access
 * it if they lack moderator privileges in the community.
 *
 * The test creates two member accounts and attempts to access a randomly generated report ID.
 * Since no report actually exists for this member and they lack moderator privileges,
 * the request should be denied with 403 Forbidden.
 *
 * Business Rules Validated:
 * - Access to reports is restricted to moderators with privileges in the community
 * - Non-moderators cannot view report details even if they submitted the report
 * - Report content remains private to the moderation workflow
 */
export async function test_api_comment_report_access_denied_without_privileges(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize member C (regular member without privileges)
  const memberCConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: "1234",
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Generate random UUIDs for the report access attempt
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // 3. Member C attempts to GET the report (should fail with 403)
  // This tests that non-moderators cannot access report details
  await TestValidator.error(
    "member without privileges cannot access report details",
    async () => {
      await api.functional.redditCommunity.member.posts.comments.reports.at(
        memberCConnection,
        {
          postId,
          commentId,
          reportId,
        },
      );
    },
  );
  // 4. Verify report access is denied with proper error message
  await TestValidator.error("report access returns 403 forbidden", async () => {
    await api.functional.redditCommunity.member.posts.comments.reports.at(
      memberCConnection,
      {
        postId,
        commentId,
        reportId,
      },
    );
  });
}
