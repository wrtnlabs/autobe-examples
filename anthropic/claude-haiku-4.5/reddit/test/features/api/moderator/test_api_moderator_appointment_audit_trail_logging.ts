import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validate moderator appointment audit trail logging.
 *
 * Tests that when a moderator is appointed to a community, an audit log entry
 * is created with complete accountability information. Verifies that the
 * appointment records the appointing moderator's ID (via creator context), the
 * appointed member's ID, the community ID, the appointed tier, and appointment
 * timestamp for complete audit trail.
 *
 * Test workflow:
 *
 * 1. Administrator creates category
 * 2. Member 1 (creator) creates account and community
 * 3. Member 2 creates account (to be appointed)
 * 4. Member 1 appoints Member 2 as senior moderator
 * 5. Verify appointment response contains complete audit information
 * 6. Validate audit trail fields for accountability
 */
export async function test_api_moderator_appointment_audit_trail_logging(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    username: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/admin/join",
    referrer: "http://localhost:3000/admin",
  };

  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: adminCredentials satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Switch to administrator connection
  const adminConnection: api.IConnection = {
    ...connection,
    headers: { ...connection.headers, Authorization: adminAuth.token.access },
  };

  // Step 2: Create category (required for community creation)
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member 1 (community creator) account
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = typia.random<string & tags.MinLength<8>>();

  const member1Auth = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      username: RandomGenerator.alphabets(8),
      password: member1Password,
      href: "http://localhost:3000/auth/join",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1Auth);

  // Switch to member 1 connection
  const member1Connection: api.IConnection = {
    ...connection,
    headers: { ...connection.headers, Authorization: member1Auth.token.access },
  };

  // Step 4: Create community with member 1 as creator
  const community =
    await api.functional.communityPlatform.member.communities.create(
      member1Connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Verify member 1 is the creator
  TestValidator.equals(
    "member 1 should be community creator",
    community.creator.id,
    member1Auth.id,
  );

  // Step 5: Create member 2 account (to be appointed as moderator)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = typia.random<string & tags.MinLength<8>>();

  const member2Auth = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      username: RandomGenerator.alphabets(8),
      password: member2Password,
      href: "http://localhost:3000/auth/join",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2Auth);

  // Step 6: Member 1 appoints member 2 as senior moderator
  const moderatorAppointment =
    await api.functional.communityPlatform.member.communities.moderators.create(
      member1Connection,
      {
        communityId: community.id,
        body: {
          memberId: member2Auth.id,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAppointment);

  // Step 7: Verify moderator appointment response contains complete audit information

  // Verify community information in audit trail
  TestValidator.equals(
    "audit trail should record appointed community ID",
    moderatorAppointment.community.id,
    community.id,
  );

  TestValidator.equals(
    "audit trail should record community identifier",
    moderatorAppointment.community.identifier,
    community.identifier,
  );

  // Verify member information in audit trail
  TestValidator.equals(
    "audit trail should record appointed member ID",
    moderatorAppointment.member.id,
    member2Auth.id,
  );

  // Verify moderator tier in audit trail
  TestValidator.equals(
    "audit trail should record appointed tier as senior",
    moderatorAppointment.moderator_tier,
    "senior",
  );

  // Step 8: Validate complete audit trail accountability

  // Verify appointment timestamp exists and is valid
  TestValidator.predicate(
    "appointed_at timestamp should be ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      moderatorAppointment.appointed_at,
    ),
  );

  // Verify creation timestamp exists
  TestValidator.predicate(
    "created_at timestamp should be ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      moderatorAppointment.created_at,
    ),
  );

  // Verify moderator is active (removed_at should be null)
  TestValidator.equals(
    "removed_at should be null for active moderator",
    moderatorAppointment.removed_at,
    null,
  );

  // Verify appointed_at and created_at are close in time (within reasonable bounds)
  const appointedTime = new Date(moderatorAppointment.appointed_at).getTime();
  const createdTime = new Date(moderatorAppointment.created_at).getTime();
  const timeDifference = Math.abs(appointedTime - createdTime);

  TestValidator.predicate(
    "appointed_at and created_at should be within 5 seconds of each other",
    timeDifference <= 5000,
  );

  // Verify member summary contains essential accountability information
  TestValidator.predicate(
    "member summary should have username",
    moderatorAppointment.member.username.length > 0,
  );

  TestValidator.predicate(
    "member summary should have email",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(moderatorAppointment.member.email),
  );

  // Verify community summary contains essential accountability information
  TestValidator.predicate(
    "community summary should have name",
    moderatorAppointment.community.name.length > 0,
  );

  TestValidator.predicate(
    "community should have subscriber count tracked",
    moderatorAppointment.community.subscriber_count >= 1,
  );
}
