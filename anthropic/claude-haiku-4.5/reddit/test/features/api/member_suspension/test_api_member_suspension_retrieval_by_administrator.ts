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

export async function test_api_member_suspension_retrieval_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create category for community classification
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member who will create community
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create moderator for decision making
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(10),
      password: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 6: Create a suspended member
  const suspendedMemberEmail = typia.random<string & tags.Format<"email">>();
  const suspendedMember = await api.functional.auth.member.join(connection, {
    body: {
      email: suspendedMemberEmail,
      username: RandomGenerator.alphabets(10),
      password: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(suspendedMember);

  // Step 7: Switch to moderator and create a report decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Create a dummy report ID to use for decision creation
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // Create report decision with suspend_user action
  const suspensionDays = 7;
  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "suspend_user",
          reason:
            "User violated community guidelines regarding harassment and inappropriate behavior",
          internal_notes: "Pattern of repeat violations detected",
          suspension_duration_days: suspensionDays,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 8: Switch back to administrator and create member suspension
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const suspensionReason =
    "User account suspended for violating community standards and repeated harassment";
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + suspensionDays * 24 * 60 * 60 * 1000,
  );

  const suspensionRecord =
    await api.functional.communityPlatform.administrator.memberSuspensions.create(
      connection,
      {
        body: {
          community_platform_member_id: suspendedMember.id,
          community_platform_report_decision_id: decision.id,
          suspension_reason: suspensionReason,
          suspended_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        } satisfies ICommunityPlatformMemberSuspension.ICreate,
      },
    );
  typia.assert(suspensionRecord);

  // Step 9: Retrieve suspension by ID and validate all details
  const retrievedSuspension =
    await api.functional.communityPlatform.administrator.memberSuspensions.at(
      connection,
      {
        suspensionId: suspensionRecord.id,
      },
    );
  typia.assert(retrievedSuspension);

  // Validate all suspension record details
  TestValidator.equals(
    "suspension ID matches created record",
    retrievedSuspension.id,
    suspensionRecord.id,
  );
  TestValidator.equals(
    "suspended member ID is correct",
    retrievedSuspension.community_platform_member_id,
    suspendedMember.id,
  );
  TestValidator.equals(
    "report decision ID is correct",
    retrievedSuspension.community_platform_report_decision_id,
    decision.id,
  );
  TestValidator.equals(
    "suspension reason is preserved",
    retrievedSuspension.suspension_reason,
    suspensionReason,
  );
  TestValidator.predicate(
    "suspended_at timestamp is populated",
    retrievedSuspension.suspended_at !== null &&
      retrievedSuspension.suspended_at !== undefined,
  );
  TestValidator.predicate(
    "expires_at timestamp is populated",
    retrievedSuspension.expires_at !== null &&
      retrievedSuspension.expires_at !== undefined,
  );
  TestValidator.predicate(
    "created_at timestamp is populated",
    retrievedSuspension.created_at !== null &&
      retrievedSuspension.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp is populated",
    retrievedSuspension.updated_at !== null &&
      retrievedSuspension.updated_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at is null for active suspension",
    retrievedSuspension.deleted_at === null ||
      retrievedSuspension.deleted_at === undefined,
  );
}
