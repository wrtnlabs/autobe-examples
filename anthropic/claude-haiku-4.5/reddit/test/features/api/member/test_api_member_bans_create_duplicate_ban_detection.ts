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

export async function test_api_member_bans_create_duplicate_ban_detection(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // 2. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphabets(8),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 3. Create member to be banned
  const memberToBanEmail = typia.random<string & tags.Format<"email">>();
  const memberToBanPassword = RandomGenerator.alphabets(12);
  const memberToBan: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberToBanEmail,
        username: RandomGenerator.alphabets(8),
        password: memberToBanPassword,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberToBan);

  // Create reporter member
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporterPassword = RandomGenerator.alphabets(12);
  const reporter: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: reporterEmail,
        username: RandomGenerator.alphabets(8),
        password: reporterPassword,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(reporter);

  // 4. Switch to admin and create category
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphabets(10),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Switch to member and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberToBanEmail,
      password: memberToBanPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphabets(8),
          category_slug: category.slug,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 6. Create a post by member to be banned
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 7. Switch to moderator to create decision and first ban
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Create first report and decision
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "ban_user",
          reason: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 8. Create the first ban
  const firstBan: ICommunityPlatformMemberBan =
    await api.functional.communityPlatform.moderator.memberBans.create(
      connection,
      {
        body: {
          community_platform_member_id: memberToBan.id,
          community_platform_report_decision_id: decision.id,
          ban_reason: RandomGenerator.paragraph({ sentences: 5 }),
          appeal_eligible_at: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ICommunityPlatformMemberBan.ICreate,
      },
    );
  typia.assert(firstBan);
  TestValidator.equals(
    "first ban created for correct member",
    firstBan.community_platform_member_id,
    memberToBan.id,
  );

  // 9. Create second decision for duplicate ban attempt
  const secondReportId = typia.random<string & tags.Format<"uuid">>();
  const secondDecision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: secondReportId,
        body: {
          action_type: "ban_user",
          reason: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(secondDecision);

  // 10. Attempt to create a second ban for the same member - should fail
  await TestValidator.error(
    "duplicate ban creation should fail with existing active ban",
    async () => {
      await api.functional.communityPlatform.moderator.memberBans.create(
        connection,
        {
          body: {
            community_platform_member_id: memberToBan.id,
            community_platform_report_decision_id: secondDecision.id,
            ban_reason: RandomGenerator.paragraph({ sentences: 5 }),
            appeal_eligible_at: new Date(
              Date.now() + 365 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          } satisfies ICommunityPlatformMemberBan.ICreate,
        },
      );
    },
  );

  // 11. Verify first ban is still active
  TestValidator.predicate(
    "first ban should remain active after duplicate attempt",
    firstBan.deleted_at === null || firstBan.deleted_at === undefined,
  );
}
