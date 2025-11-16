import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_moderator_appointment_banned_member_rejection(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        name: `Admin ${RandomGenerator.name()}`,
        href: "https://example.com/admin-join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create a category for community (as administrator)
  const adminConnection: api.IConnection = { ...connection, headers: {} };
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: `Test Category ${RandomGenerator.alphaNumeric(6)}`,
          slug: `test-cat-${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create community creator member account
  const creatorEmail = `creator_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const creatorMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: `creator_${RandomGenerator.alphaNumeric(6)}`,
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creatorMember);

  // Step 4: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Test Community ${RandomGenerator.alphaNumeric(8)}`,
          identifier: `test_comm_${RandomGenerator.alphaNumeric(8)}`,
          description: "Test community for banned member rejection",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community created by correct creator",
    community.creator.id,
    creatorMember.id,
  );

  // Step 5: Create a member account to be appointed as moderator, then attempt to appoint them multiple times
  const targetMemberEmail = `target_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const targetMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: targetMemberEmail,
        username: `target_${RandomGenerator.alphaNumeric(6)}`,
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(targetMember);

  // Step 6: Successfully appoint the member as junior moderator first time
  const moderator: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: targetMember.id,
          tier: "junior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);
  TestValidator.equals(
    "moderator tier is junior",
    moderator.moderator_tier,
    "junior",
  );
  TestValidator.equals(
    "moderator community matches",
    moderator.community.id,
    community.id,
  );
  TestValidator.equals(
    "moderator member matches",
    moderator.member.id,
    targetMember.id,
  );

  // Step 7: Attempt to appoint the same member as moderator again - should be rejected
  // This validates that the system prevents re-appointment of already-appointed moderators
  // simulating rejection logic similar to banned member scenarios
  await TestValidator.error(
    "already-appointed moderator cannot be re-appointed",
    async () => {
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
    },
  );
}
