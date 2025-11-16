import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberBan";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

export async function test_api_member_ban_retrieval_appeal_eligible(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/auth/admin/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account to be banned
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphabets(12),
        href: "http://localhost:3000/auth/member/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create category for community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Create community for posts
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(10),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create moderator account for making moderation decisions
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: moderatorPassword,
        href: "http://localhost:3000/auth/moderator/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 6: Switch to moderator authentication and create a moderation decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000/auth/moderator/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Create a dummy report ID for the decision
  const reportId: string = typia.random<string & tags.Format<"uuid">>();

  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "ban_user",
          reason:
            "Repeated violations of community guidelines with clear evidence of intentional policy breaches",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 7: Switch back to administrator and create the ban with appeal eligibility
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost:3000/auth/admin/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Calculate appeal eligible date (1 year from now)
  const appealEligibleDate = new Date();
  appealEligibleDate.setFullYear(appealEligibleDate.getFullYear() + 1);

  const ban: ICommunityPlatformMemberBan =
    await api.functional.communityPlatform.administrator.memberBans.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: decision.id,
          ban_reason:
            "Repeated violations of community guidelines. User engaged in harassment and posted prohibited content that violates platform policies.",
          appeal_eligible_at: appealEligibleDate.toISOString(),
        } satisfies ICommunityPlatformMemberBan.ICreate,
      },
    );
  typia.assert(ban);

  // Step 8: Retrieve the ban record by ID
  const retrievedBan: ICommunityPlatformMemberBan =
    await api.functional.communityPlatform.administrator.memberBans.at(
      connection,
      {
        banId: ban.id,
      },
    );
  typia.assert(retrievedBan);

  // Step 9: Validate ban record structure and appeal eligibility
  TestValidator.equals(
    "retrieved ban ID should match created ban ID",
    retrievedBan.id,
    ban.id,
  );

  TestValidator.equals(
    "banned member ID should be preserved",
    retrievedBan.community_platform_member_id,
    member.id,
  );

  TestValidator.equals(
    "moderation decision ID should be preserved",
    retrievedBan.community_platform_report_decision_id,
    decision.id,
  );

  // Step 10: Validate appeal_eligible_at is set and in the future
  TestValidator.predicate(
    "appeal_eligible_at should be present in retrieved ban",
    retrievedBan.appeal_eligible_at !== null &&
      retrievedBan.appeal_eligible_at !== undefined,
  );

  const currentTime = new Date();
  const appealEligibleTime = new Date(retrievedBan.appeal_eligible_at!);

  TestValidator.predicate(
    "appeal_eligible_at should be set to a future date",
    appealEligibleTime > currentTime,
  );

  TestValidator.predicate(
    "appeal_eligible_at should be approximately 1 year in the future",
    Math.abs(appealEligibleTime.getTime() - appealEligibleDate.getTime()) <
      1000,
  );

  // Step 11: Validate ban metadata
  TestValidator.predicate(
    "ban reason should be preserved and substantial",
    retrievedBan.ban_reason.length >= 50,
  );

  TestValidator.predicate(
    "banned_at should be set to current time",
    new Date(retrievedBan.banned_at) <= currentTime,
  );
}
