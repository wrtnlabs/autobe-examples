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
 * Test the complete moderator assignment creation workflow where an
 * administrator creates a new moderator assignment for a community. Validates
 * that administrators can successfully assign moderator privileges to member
 * actors with appropriate permission levels while maintaining security
 * boundaries.
 */
export async function test_api_moderator_assignment_creation_by_admin(
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
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a member account that will be assigned as moderator
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        ip: typia.random<string>(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create a community to serve as moderator assignment target
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

  // Step 4: Authenticate as administrator to ensure proper permissions
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      ip: null,
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Create moderator assignment with member actor and full permissions
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

  // Step 6: Validate the moderator assignment
  TestValidator.equals(
    "moderator assignment community matches created community",
    moderatorAssignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "moderator assignment actor type is member",
    moderatorAssignment.actor_type,
    "member",
  );
  TestValidator.equals(
    "moderator assignment permission level is full",
    moderatorAssignment.permission_level,
    "full",
  );
  TestValidator.equals(
    "moderator assignment actor id matches member id",
    moderatorAssignment.actor.id,
    member.id,
  );
  TestValidator.equals(
    "moderator assignment community platform community id matches",
    moderatorAssignment.community_platform_community_id,
    community.id,
  );
  TestValidator.predicate(
    "moderator assignment has assignment timestamp",
    moderatorAssignment.assigned_at !== null &&
      moderatorAssignment.assigned_at !== undefined,
  );
  TestValidator.predicate(
    "moderator assignment is not revoked",
    moderatorAssignment.revoked_at === null ||
      moderatorAssignment.revoked_at === undefined,
  );
  TestValidator.predicate(
    "moderator assignment actor is member summary type",
    (moderatorAssignment.actor as ICommunityPlatformMember.ISummary).email !==
      undefined,
  );
}
