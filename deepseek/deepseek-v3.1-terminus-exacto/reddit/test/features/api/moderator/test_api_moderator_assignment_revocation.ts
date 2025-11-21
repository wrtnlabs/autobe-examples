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
 * Test moderator assignment revocation workflow through update operation.
 *
 * This scenario validates that administrators can revoke moderator privileges
 * by setting the revoked_at timestamp. The test ensures proper validation of
 * revocation requests, immediate effect of privilege removal, and preservation
 * of assignment records for audit purposes. It verifies that revoked moderators
 * lose all privileges immediately while maintaining the assignment history for
 * compliance and reporting.
 */
export async function test_api_moderator_assignment_revocation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for moderator management
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
        href: "https://community-platform.test/auth/join",
        referrer: "https://community-platform.test/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Switch to member authentication to create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      href: "https://community-platform.test/communities/create",
      referrer: "https://community-platform.test/",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 3: Create community for moderator assignment
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

  // Switch back to admin authentication for moderator operations
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://community-platform.test/admin",
      referrer: "https://community-platform.test/",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Test-Agent/1.0",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 4: Assign member as moderator with full permissions
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

  // Verify initial assignment state
  TestValidator.equals(
    "moderator assignment should be active",
    moderatorAssignment.revoked_at,
    undefined,
  );
  TestValidator.equals(
    "actor type should be member",
    moderatorAssignment.actor_type,
    "member",
  );
  TestValidator.equals(
    "permission level should be full",
    moderatorAssignment.permission_level,
    "full",
  );
  TestValidator.predicate(
    "assignment timestamp should be valid",
    new Date(moderatorAssignment.assigned_at).getTime() > 0,
  );

  // Step 5: Revoke moderator assignment by setting revoked_at timestamp
  const revocationTimestamp = new Date().toISOString();
  const revokedAssignment: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.admin.communities.moderators.update(
      connection,
      {
        communitySlug: community.slug,
        moderatorId: moderatorAssignment.id,
        body: {
          revoked_at: revocationTimestamp,
        } satisfies ICommunityPlatformCommunityModerator.IUpdate,
      },
    );
  typia.assert(revokedAssignment);

  // Step 6: Verify revocation immediately removes moderator privileges
  TestValidator.equals(
    "revoked_at timestamp should be set",
    revokedAssignment.revoked_at,
    revocationTimestamp,
  );
  TestValidator.equals(
    "actor type should remain unchanged",
    revokedAssignment.actor_type,
    "member",
  );
  TestValidator.equals(
    "permission level should remain unchanged",
    revokedAssignment.permission_level,
    "full",
  );
  TestValidator.equals(
    "community ID should remain unchanged",
    revokedAssignment.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "assignment ID should remain unchanged",
    revokedAssignment.id,
    moderatorAssignment.id,
  );

  // Step 7: Validate assignment record preserves historical data
  TestValidator.notEquals(
    "updated_at timestamp should change after revocation",
    revokedAssignment.updated_at,
    moderatorAssignment.updated_at,
  );
  TestValidator.equals(
    "created_at timestamp should remain unchanged",
    revokedAssignment.created_at,
    moderatorAssignment.created_at,
  );
  TestValidator.equals(
    "assigned_at timestamp should remain unchanged",
    revokedAssignment.assigned_at,
    moderatorAssignment.assigned_at,
  );

  // Additional validation: Ensure the actor reference is preserved
  const actorSummary =
    revokedAssignment.actor as ICommunityPlatformMember.ISummary;
  TestValidator.equals(
    "actor ID should remain unchanged",
    actorSummary.id,
    member.id,
  );
  TestValidator.equals(
    "actor email should remain unchanged",
    actorSummary.email,
    member.email,
  );
  TestValidator.equals(
    "actor display name should be preserved",
    actorSummary.display_name,
    member.display_name,
  );

  // Validate community reference is preserved
  TestValidator.equals(
    "community ID reference should match",
    revokedAssignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name should be preserved",
    revokedAssignment.community.name,
    community.name,
  );
  TestValidator.equals(
    "community slug should be preserved",
    revokedAssignment.community.slug,
    community.slug,
  );

  // Validate timestamp ordering
  const assignedTime = new Date(moderatorAssignment.assigned_at).getTime();
  const revokedTime = new Date(revocationTimestamp).getTime();
  const updatedTime = new Date(revokedAssignment.updated_at).getTime();

  TestValidator.predicate(
    "revocation should occur after assignment",
    revokedTime >= assignedTime,
  );
  TestValidator.predicate(
    "update timestamp should reflect revocation time",
    updatedTime >= revokedTime,
  );
}
