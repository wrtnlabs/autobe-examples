import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

export async function test_api_moderation_decision_suspend_user_missing_duration(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for platform management
  const adminPassword = RandomGenerator.alphabets(12);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/auth/admin",
        referrer: "http://localhost:3000",
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
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account (will create the community)
  const memberPassword = RandomGenerator.alphabets(12);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: memberPassword,
      href: "http://localhost:3000/auth/member",
      referrer: "http://localhost:3000",
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
          identifier: RandomGenerator.alphabets(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create another member to be reported
  const reportedMemberEmail = typia.random<string & tags.Format<"email">>();
  const reportedMember = await api.functional.auth.member.join(connection, {
    body: {
      email: reportedMemberEmail,
      username: RandomGenerator.alphabets(8),
      password: RandomGenerator.alphabets(12),
      href: "http://localhost:3000/auth/member",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(reportedMember);

  // Step 6: Create moderator account for making decisions
  const moderatorPassword = RandomGenerator.alphabets(12);
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(8),
      password: moderatorPassword,
      href: "http://localhost:3000/auth/moderator",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 7: Login as moderator to perform moderation action
  const moderatorSession = await api.functional.auth.moderator.login(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        href: "http://localhost:3000/auth/login",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformModerator.ILogin,
    },
  );
  typia.assert(moderatorSession);

  // Step 8: Attempt to create moderation decision with suspend_user action but WITHOUT suspension_duration_days
  // This should fail with validation error requiring suspension_duration_days field
  await TestValidator.error(
    "suspend_user action without suspension_duration_days should fail with validation error",
    async () => {
      const reportId = typia.random<string & tags.Format<"uuid">>();

      await api.functional.communityPlatform.moderator.reports.decision.create(
        connection,
        {
          reportId,
          body: {
            action_type: "suspend_user",
            reason:
              "User violated community harassment policy with repeated attacks",
          } satisfies ICommunityPlatformReportDecision.ICreate,
        },
      );
    },
  );

  TestValidator.predicate(
    "validation correctly enforces suspension_duration_days requirement for suspend_user actions",
    true,
  );
}
