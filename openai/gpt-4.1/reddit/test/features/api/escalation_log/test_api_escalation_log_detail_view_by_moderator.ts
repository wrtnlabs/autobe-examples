import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformEscalationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformEscalationLog";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";

/**
 * Validates that a moderator assigned to a community can retrieve escalation
 * log details, and that access is denied otherwise.
 *
 * 1. Register a member (to act as community creator and report submitter)
 * 2. Create a community as that member
 * 3. Register a moderator for the created community
 * 4. As the member, submit a report with a valid report_category_id
 * 5. As the moderator, create an escalation log for the report
 * 6. Retrieve and verify the escalation log as the assigned moderator
 * 7. Attempt to retrieve using a non-existent escalation log ID (should error)
 * 8. Register a moderator for another community, attempt to access the first
 *    escalation log (should error)
 */
export async function test_api_escalation_log_detail_view_by_moderator(
  connection: api.IConnection,
) {
  // Register test member (who will also be the community creator)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "StrongPassword!123",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Create a test community
  const communityParams = {
    name: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    slug: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityParams },
    );
  typia.assert(community);

  // Register a moderator assigned to the community
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "StrongerPassword!456" as string & tags.Format<"password">,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);

  // Member submits a report (using synthetic report_category_id)
  const reportCategoryId = typia.random<string & tags.Format<"uuid">>(); // In real-life, would fetch from categories API
  const reportBody = {
    post_id: typia.random<string & tags.Format<"uuid">>(), // Simulate target post
    report_category_id: reportCategoryId,
    reason_text: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformReport.ICreate;
  // Simulate authentication context by reusing connection (already authorized)
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    { body: reportBody },
  );
  typia.assert(report);

  // Authenticate as moderator for escalation log creation
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "StrongerPassword!456" as string & tags.Format<"password">,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });

  // Create escalation log for this report
  const escalationLogCreate = {
    initiator_id: moderator.id,
    report_id: report.id,
    escalation_reason: RandomGenerator.paragraph({ sentences: 2 }),
    status: "pending",
  } satisfies ICommunityPlatformEscalationLog.ICreate;
  const escalationLog =
    await api.functional.communityPlatform.moderator.escalationLogs.create(
      connection,
      { body: escalationLogCreate },
    );
  typia.assert(escalationLog);

  // Now, as the assigned moderator, fetch the escalation log details
  const fetched =
    await api.functional.communityPlatform.moderator.escalationLogs.at(
      connection,
      { escalationLogId: escalationLog.id },
    );
  typia.assert(fetched);
  TestValidator.equals(
    "Returned escalation log matches created",
    fetched,
    escalationLog,
    (key) => key === "updated_at" || key === "created_at",
  );

  // Edge: Fetch with a non-existent escalation log ID (should throw)
  await TestValidator.error(
    "Fetch non-existent escalation log ID fails",
    async () => {
      await api.functional.communityPlatform.moderator.escalationLogs.at(
        connection,
        {
          escalationLogId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Edge: Another moderator from a different community should not access log
  // Create different community and moderator
  const otherCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          slug: RandomGenerator.alphaNumeric(12),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(otherCommunity);

  const otherModeratorEmail = typia.random<string & tags.Format<"email">>();
  const otherModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: otherModeratorEmail,
      password: "SomeModPassw0rd!" as string & tags.Format<"password">,
      community_id: otherCommunity.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(otherModerator);

  // Login as unrelated moderator before attempting to access escalation log
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: otherModeratorEmail,
      password: "SomeModPassw0rd!" as string & tags.Format<"password">,
      community_id: otherCommunity.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  await TestValidator.error(
    "Unassigned moderator cannot access escalation log",
    async () => {
      await api.functional.communityPlatform.moderator.escalationLogs.at(
        connection,
        {
          escalationLogId: escalationLog.id,
        },
      );
    },
  );
}
