import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSuspension";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

export async function test_api_member_suspension_update_multiple_fields_simultaneously(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // 2. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 3. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(10),
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // 4. Create a post by member
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 5. Create a report on the post
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        reported_post_id: post.id,
        category: "harassment",
        additional_details: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);

  // 6. Login as moderator and create moderation decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "suspend_user",
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          suspension_duration_days: 7,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 7. Login as administrator and create suspension
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const now = new Date();
  const suspendedAt = now.toISOString();
  const expiresAt = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const suspension =
    await api.functional.communityPlatform.administrator.memberSuspensions.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: decision.id,
          suspension_reason: RandomGenerator.paragraph({ sentences: 3 }),
          suspended_at: suspendedAt,
          expires_at: expiresAt,
        } satisfies ICommunityPlatformMemberSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // 8. Update suspension with multiple fields simultaneously
  const updatedExpiresAt = new Date(
    now.getTime() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const updatedReason = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 5,
    wordMax: 10,
  });

  const updatedSuspension =
    await api.functional.communityPlatform.administrator.memberSuspensions.update(
      connection,
      {
        suspensionId: suspension.id,
        body: {
          expires_at: updatedExpiresAt,
          suspension_reason: updatedReason,
        } satisfies ICommunityPlatformMemberSuspension.IUpdate,
      },
    );
  typia.assert(updatedSuspension);

  // 9. Verify that updated fields are correctly stored
  TestValidator.equals(
    "suspension reason should be updated",
    updatedSuspension.suspension_reason,
    updatedReason,
  );
  TestValidator.equals(
    "expiration date should be extended",
    updatedSuspension.expires_at,
    updatedExpiresAt,
  );

  // 10. Verify that unspecified fields remain unchanged
  TestValidator.equals(
    "member id should remain unchanged",
    updatedSuspension.community_platform_member_id,
    suspension.community_platform_member_id,
  );
  TestValidator.equals(
    "decision id should remain unchanged",
    updatedSuspension.community_platform_report_decision_id,
    suspension.community_platform_report_decision_id,
  );
  TestValidator.equals(
    "suspension start time should remain unchanged",
    updatedSuspension.suspended_at,
    suspension.suspended_at,
  );

  // 11. Verify that updated_at timestamp reflects the modification
  TestValidator.predicate(
    "updated_at should be later than original creation",
    new Date(updatedSuspension.updated_at).getTime() >=
      new Date(suspension.created_at).getTime(),
  );

  // 12. Test partial update with only suspension_reason
  const partialUpdatedReason = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 6,
    wordMax: 9,
  });

  const partialUpdatedSuspension =
    await api.functional.communityPlatform.administrator.memberSuspensions.update(
      connection,
      {
        suspensionId: suspension.id,
        body: {
          suspension_reason: partialUpdatedReason,
        } satisfies ICommunityPlatformMemberSuspension.IUpdate,
      },
    );
  typia.assert(partialUpdatedSuspension);

  TestValidator.equals(
    "suspension reason should be updated in partial update",
    partialUpdatedSuspension.suspension_reason,
    partialUpdatedReason,
  );
  TestValidator.equals(
    "expires_at should remain from previous update",
    partialUpdatedSuspension.expires_at,
    updatedExpiresAt,
  );

  // 13. Test partial update with only expires_at
  const newExpiresAt = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const anotherPartialUpdate =
    await api.functional.communityPlatform.administrator.memberSuspensions.update(
      connection,
      {
        suspensionId: suspension.id,
        body: {
          expires_at: newExpiresAt,
        } satisfies ICommunityPlatformMemberSuspension.IUpdate,
      },
    );
  typia.assert(anotherPartialUpdate);

  TestValidator.equals(
    "expires_at should be updated",
    anotherPartialUpdate.expires_at,
    newExpiresAt,
  );
  TestValidator.equals(
    "suspension_reason should remain from previous update",
    anotherPartialUpdate.suspension_reason,
    partialUpdatedReason,
  );
}
