import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSuspension";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

export async function test_api_member_suspension_update_make_permanent(
  connection: api.IConnection,
) {
  // Step 1: Create administrator
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
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create moderator and store password
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(8),
      password: moderatorPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Create member to be suspended
  const suspendedMemberEmail = typia.random<string & tags.Format<"email">>();
  const suspendedMember = await api.functional.auth.member.join(connection, {
    body: {
      email: suspendedMemberEmail,
      username: RandomGenerator.alphabets(8),
      password: RandomGenerator.alphaNumeric(12),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(suspendedMember);

  // Step 5: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          category_slug: category.slug,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 6: Create a test report (we need a reportId for decision creation)
  // Note: Creating a report typically requires reporting content, but we'll use a random UUID
  // that represents a report that was created in the system
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // Step 7: Create moderator's second connection/session for authenticated operations
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 8: Create report decision
  const reportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "suspend_user",
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          suspension_duration_days: 7,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(reportDecision);

  // Step 9: Create initial time-limited suspension with 7-day expiration
  const futureExpiration = new Date();
  futureExpiration.setDate(futureExpiration.getDate() + 7);

  const suspension =
    await api.functional.communityPlatform.moderator.memberSuspensions.create(
      connection,
      {
        body: {
          community_platform_member_id: suspendedMember.id,
          community_platform_report_decision_id: reportDecision.id,
          suspension_reason: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 5,
            wordMax: 10,
          }),
          suspended_at: new Date().toISOString(),
          expires_at: futureExpiration.toISOString(),
        } satisfies ICommunityPlatformMemberSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Validate initial suspension has expiration date
  TestValidator.predicate(
    "initial suspension has future expiration date",
    suspension.expires_at !== null && suspension.expires_at !== undefined,
  );

  // Step 10: Update suspension to make it permanent by setting expires_at to null
  const updatedSuspension =
    await api.functional.communityPlatform.moderator.memberSuspensions.update(
      connection,
      {
        suspensionId: suspension.id,
        body: {
          suspension_reason: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 5,
            wordMax: 10,
          }),
          expires_at: null,
        } satisfies ICommunityPlatformMemberSuspension.IUpdate,
      },
    );
  typia.assert(updatedSuspension);

  // Step 11: Validate the suspension is now permanent
  TestValidator.predicate(
    "updated suspension has null expires_at making it permanent",
    updatedSuspension.expires_at === null,
  );

  // Step 12: Validate other fields remain consistent
  TestValidator.equals(
    "suspension member ID unchanged",
    updatedSuspension.community_platform_member_id,
    suspension.community_platform_member_id,
  );

  TestValidator.equals(
    "suspension decision ID unchanged",
    updatedSuspension.community_platform_report_decision_id,
    suspension.community_platform_report_decision_id,
  );

  TestValidator.equals(
    "suspension start time unchanged",
    updatedSuspension.suspended_at,
    suspension.suspended_at,
  );

  TestValidator.predicate(
    "suspension reason was updated",
    updatedSuspension.suspension_reason !== suspension.suspension_reason,
  );
}
