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
 * Test successful appointment of a member as a senior moderator to a community.
 *
 * This test validates the complete moderator appointment workflow:
 *
 * 1. Administrator creates a category for community classification
 * 2. Community creator registers and creates a community
 * 3. Member account is created to be appointed as moderator
 * 4. Member is appointed as senior moderator to the community
 * 5. Verify appointment response includes correct tier, timestamps, and summaries
 *
 * Steps:
 *
 * 1. Create administrator account
 * 2. Create category via administrator
 * 3. Create community creator member account
 * 4. Create community by community creator
 * 5. Create target member account to be appointed as moderator
 * 6. Appoint target member as senior moderator
 * 7. Validate moderator appointment details (tier, timestamps, summaries)
 */
export async function test_api_moderator_appointment_senior_tier(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Switch to admin context for category creation
  connection.headers ??= {};
  connection.headers.Authorization = admin.token.access;

  // Step 2: Create a category for community classification
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Technology and software discussion",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.equals("category name", category.name, "Technology");

  // Step 3: Create community creator member account
  const creatorMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: "CreatorPass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creatorMember);

  // Switch to creator context for community creation
  connection.headers.Authorization = creatorMember.token.access;

  // Step 4: Create a community by the community creator
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussions",
          identifier: `tech_discussions_${RandomGenerator.alphaNumeric(6)}`,
          description: "A community for technology discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals("community name", community.name, "Tech Discussions");
  TestValidator.equals(
    "community category id",
    community.category.id,
    category.id,
  );

  // Step 5: Create target member account to be appointed as moderator
  const targetMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: "TargetPass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(targetMember);

  // Switch back to creator context for moderator appointment
  connection.headers.Authorization = creatorMember.token.access;

  // Step 6: Appoint target member as senior moderator to the community
  const moderatorAppointment: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: targetMember.id,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAppointment);

  // Step 7: Validate moderator appointment details
  TestValidator.equals(
    "moderator tier should be senior",
    moderatorAppointment.moderator_tier,
    "senior",
  );
  TestValidator.equals(
    "moderator member id should match target member",
    moderatorAppointment.member.id,
    targetMember.id,
  );
  TestValidator.equals(
    "moderator community id should match community",
    moderatorAppointment.community.id,
    community.id,
  );

  // Step 8: Verify appointment is active (removed_at is null)
  TestValidator.predicate(
    "moderator should be active (removed_at is null)",
    moderatorAppointment.removed_at === null,
  );

  // Step 9: Verify appointment timestamps are properly recorded
  TestValidator.predicate(
    "appointed_at should be a valid ISO 8601 date-time",
    () => {
      try {
        const date = new Date(moderatorAppointment.appointed_at);
        return !isNaN(date.getTime());
      } catch {
        return false;
      }
    },
  );

  TestValidator.predicate(
    "created_at should be a valid ISO 8601 date-time",
    () => {
      try {
        const date = new Date(moderatorAppointment.created_at);
        return !isNaN(date.getTime());
      } catch {
        return false;
      }
    },
  );

  // Step 10: Verify member summary information is complete
  TestValidator.predicate(
    "member summary should have username",
    moderatorAppointment.member.username.length > 0,
  );
  TestValidator.predicate(
    "member summary should have email",
    moderatorAppointment.member.email.length > 0,
  );
  TestValidator.equals(
    "member account status should be active",
    moderatorAppointment.member.account_status,
    "active",
  );

  // Step 11: Verify community summary information is complete
  TestValidator.predicate(
    "community summary should have name",
    moderatorAppointment.community.name.length > 0,
  );
  TestValidator.predicate(
    "community summary should have identifier",
    moderatorAppointment.community.identifier.length > 0,
  );
  TestValidator.predicate(
    "community summary should have valid subscriber count",
    moderatorAppointment.community.subscriber_count >= 0,
  );
}
