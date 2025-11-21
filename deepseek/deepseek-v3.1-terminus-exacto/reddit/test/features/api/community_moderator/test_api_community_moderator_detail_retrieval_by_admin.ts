import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test detailed moderator assignment information retrieval for community
 * administrators.
 *
 * This comprehensive E2E test validates that administrators can access complete
 * moderator assignment details including actor information, permission levels,
 * assignment history, and community context. The test follows a complete
 * workflow from user creation through moderator assignment to detailed
 * information retrieval.
 */
export async function test_api_community_moderator_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account to be assigned as moderator
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

  // Step 3: Authenticate as member to create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      href: "https://example.com/create-community",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 4: Create community for moderator assignment
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

  // Step 5: Authenticate as admin to assign moderator
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

  // Step 6: Assign member as moderator to the community
  const moderatorAssignment: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.admin.communities.moderators.create(
      connection,
      {
        communitySlug: community.slug,
        body: {
          actor_type: "member",
          permission_level: "full",
          actor_member_id: member.id,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // Step 7: Retrieve moderator assignment details using admin account
  const retrievedModerator: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.admin.communities.moderators.at(
      connection,
      {
        communitySlug: community.slug,
        moderatorId: moderatorAssignment.id,
      },
    );
  typia.assert(retrievedModerator);

  // Step 8: Validate moderator assignment details
  TestValidator.equals(
    "moderator ID matches",
    retrievedModerator.id,
    moderatorAssignment.id,
  );
  TestValidator.equals(
    "actor type is member",
    retrievedModerator.actor_type,
    "member",
  );
  TestValidator.equals(
    "permission level is full",
    retrievedModerator.permission_level,
    "full",
  );
  TestValidator.equals(
    "community ID matches",
    retrievedModerator.community.id,
    community.id,
  );
  TestValidator.equals(
    "assigned at timestamp exists",
    typeof retrievedModerator.assigned_at,
    "string",
  );
  TestValidator.predicate(
    "assigned at is valid date",
    retrievedModerator.assigned_at.length > 0,
  );
  TestValidator.equals(
    "revoked at is undefined",
    retrievedModerator.revoked_at,
    undefined,
  );

  // Validate actor information
  TestValidator.predicate(
    "actor is member summary",
    (retrievedModerator.actor as ICommunityPlatformMember.ISummary).email ===
      member.email,
  );
  TestValidator.equals(
    "actor email matches",
    (retrievedModerator.actor as ICommunityPlatformMember.ISummary).email,
    member.email,
  );
  TestValidator.equals(
    "actor display name matches",
    (retrievedModerator.actor as ICommunityPlatformMember.ISummary)
      .display_name,
    member.display_name,
  );

  // Validate community information
  TestValidator.equals(
    "community name matches",
    retrievedModerator.community.name,
    community.name,
  );
  TestValidator.equals(
    "community slug matches",
    retrievedModerator.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "community status is active",
    retrievedModerator.community.status,
    "active",
  );
  TestValidator.equals(
    "community privacy is public",
    retrievedModerator.community.privacy,
    "public",
  );
}
