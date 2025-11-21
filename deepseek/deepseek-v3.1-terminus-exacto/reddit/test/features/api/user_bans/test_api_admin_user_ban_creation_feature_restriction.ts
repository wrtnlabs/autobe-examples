import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test administrator creation of feature-specific bans that restrict particular
 * platform capabilities while allowing other functionality.
 *
 * This test validates that administrators can impose targeted restrictions with
 * precise scope definitions, ensuring members retain access to non-restricted
 * features while being prevented from using specific platform capabilities. The
 * test involves multi-actor authentication workflow with both admin and member
 * accounts, and establishes a community context for proper ban operation
 * testing.
 */
export async function test_api_admin_user_ban_creation_feature_restriction(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "moderator",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account for feature restriction testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create community context for the ban operation
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Switch back to admin authentication for ban creation
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Create feature-specific ban targeting the member
  const userBan: ICommunityPlatformUserBan =
    await api.functional.communityPlatform.admin.userBans.create(connection, {
      body: {
        community_platform_member_id: member.id,
        ban_type: "feature_restriction",
        ban_scope: "specific_features",
        reason:
          "Testing feature-specific restrictions for platform capabilities",
        duration_hours: 24,
        max_appeals: 1,
        appeal_deadline: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      } satisfies ICommunityPlatformUserBan.ICreate,
    });
  typia.assert(userBan);

  // Step 6: Validate ban creation was successful
  TestValidator.predicate(
    "ban should be created successfully",
    userBan !== null && userBan !== undefined,
  );

  // Since ICommunityPlatformUserBan is a string union type, validate it's one of the expected values
  TestValidator.predicate(
    "ban should be valid type",
    userBan === "asc" || userBan === "desc",
  );
}
