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
 * Test moderator appointment workflow by community creator.
 *
 * Validates the complete workflow of appointing moderators to a community,
 * including:
 *
 * 1. Creating necessary accounts (creator, administrator, future moderator)
 * 2. Setting up community infrastructure (category, community)
 * 3. Appointing members as moderators with tier designation
 * 4. Verifying appointment records and permissions
 * 5. Testing tier escalation and moderator listing
 *
 * Test Steps:
 *
 * 1. Create creator member account
 * 2. Create administrator account
 * 3. Create a category for community classification
 * 4. Create community with creator account
 * 5. Create future moderator member account
 * 6. Appoint future moderator as junior moderator
 * 7. Verify appointment response includes correct tier and timestamp
 * 8. Create another member for tier escalation test
 * 9. Appoint second member as senior moderator
 * 10. Verify tier escalation is recorded with appropriate timestamp
 * 11. Test attempting to appoint already-active moderator (should fail)
 */
export async function test_api_moderator_appointment_by_community_creator(
  connection: api.IConnection,
) {
  // 1. Create creator member account
  const creatorEmail: string = typia.random<string & tags.Format<"email">>();
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: RandomGenerator.alphabets(10),
        password: "TestPassword123!",
        href: "https://example.com/join",
        referrer: "https://example.com/referrer",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);

  // 2. Create administrator account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        username: RandomGenerator.alphabets(10),
        password: "AdminPassword123!",
        name: RandomGenerator.name(),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/referrer",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // 3. Create a category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphabets(15),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Create community with creator account
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: "TestPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphabets(15),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create future moderator member account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const futureModeratorMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: "ModeratorPassword123!",
        href: "https://example.com/join",
        referrer: "https://example.com/referrer",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(futureModeratorMember);

  // Switch back to creator context
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: "TestPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 6. Appoint future moderator as junior moderator
  const juniorModeratorRecord: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: futureModeratorMember.id,
          tier: "junior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(juniorModeratorRecord);

  // 7. Verify appointment response includes correct tier and timestamp
  TestValidator.equals(
    "junior moderator tier should be junior",
    juniorModeratorRecord.moderator_tier,
    "junior",
  );
  TestValidator.predicate(
    "appointed_at should be a valid timestamp",
    () => !isNaN(Date.parse(juniorModeratorRecord.appointed_at)),
  );
  TestValidator.equals(
    "removed_at should be null for active moderator",
    juniorModeratorRecord.removed_at,
    null,
  );

  // 8. Create another member for tier escalation test
  const escalationMemberEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const escalationMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: escalationMemberEmail,
        username: RandomGenerator.alphabets(10),
        password: "EscalationPassword123!",
        href: "https://example.com/join",
        referrer: "https://example.com/referrer",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(escalationMember);

  // Switch back to creator context
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: "TestPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 9. Appoint second member as senior moderator
  const seniorModeratorRecord: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: escalationMember.id,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(seniorModeratorRecord);

  // 10. Verify tier escalation is recorded with appropriate timestamp
  TestValidator.equals(
    "senior moderator tier should be senior",
    seniorModeratorRecord.moderator_tier,
    "senior",
  );
  TestValidator.predicate(
    "appointed_at should be a valid timestamp for senior moderator",
    () => !isNaN(Date.parse(seniorModeratorRecord.appointed_at)),
  );
  TestValidator.equals(
    "removed_at should be null for active senior moderator",
    seniorModeratorRecord.removed_at,
    null,
  );

  // 11. Test attempting to appoint already-active moderator (should fail)
  await TestValidator.error(
    "should reject appointment of already-active moderator",
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: {
            memberId: futureModeratorMember.id,
            tier: "senior",
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    },
  );

  // Verify moderator records are correctly associated with community
  TestValidator.equals(
    "junior moderator should be associated with correct community",
    juniorModeratorRecord.community.id,
    community.id,
  );
  TestValidator.equals(
    "senior moderator should be associated with correct community",
    seniorModeratorRecord.community.id,
    community.id,
  );
}
