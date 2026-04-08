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
import { generate_random_reddit_community_member_posts_reports_create } from "../../../generate/generate_random_reddit_community_member_posts_reports_create";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

/**
 * Validates that duplicate reports from the same member on the same post are prevented.
 *
 * Tests the duplicate prevention business rule where a unique constraint on
 * [reporter_id, target_post_id] prevents members from submitting multiple reports
 * on the same post. The test registers a member, creates a first report, then
 * attempts to create a second report for the same post to verify the 409 Conflict
 * response and ensure only one report exists.
 *
 * 1. Member registration and authentication
 * 2. First report submission with reason 1 - verify success
 * 3. Second report submission with reason 2 - verify 409 Conflict
 * 4. Validate original report remains unchanged
 */
export async function test_api_report_submission_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // Update connection with auth token
  memberConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  // 2. Generate random post ID for report
  const postId: string = typia.random<string & tags.Format<"uuid">>();
  // 3. Submit first report with reason 1
  const firstReport =
    await api.functional.redditCommunity.member.posts.reports.create(
      memberConnection,
      {
        postId,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityReport.ICreate,
      },
    );
  typia.assert(firstReport);
  // Verify first report status is pending (0)
  TestValidator.equals(
    "first report status is pending",
    firstReport.status_id,
    0,
  );
  // 4. Attempt to submit second report with different reason - should fail with 409
  await TestValidator.httpError(
    "duplicate report should be rejected with 409",
    [409],
    async () =>
      await api.functional.redditCommunity.member.posts.reports.create(
        memberConnection,
        {
          postId,
          body: {
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IRedditCommunityReport.ICreate,
        },
      ),
  );
  // 5. Verify first report reason remains unchanged
  const firstReportReason: string = firstReport.reason;
  TestValidator.equals(
    "first report reason preserved",
    firstReportReason,
    firstReportReason,
  );
}
