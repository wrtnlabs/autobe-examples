import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_moderator_appointment_successful_junior(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account to set up platform categories
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(12),
        name: RandomGenerator.name(),
        href: "https://example.com/admin/register",
        referrer: "https://example.com/",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category for community classification
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Technology and programming discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create the community creator member account
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: RandomGenerator.alphabets(10),
        password: "CreatorPass123!",
        href: "https://example.com/join",
        referrer: "https://example.com/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);

  // Step 4: Creator creates a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussions",
          identifier: `tech_${RandomGenerator.alphaNumeric(8)}`,
          description: "A community for technology discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create the member to be appointed as moderator
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: "MemberPass123!",
        href: "https://example.com/join",
        referrer: "https://example.com/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 6: Switch back to creator context for moderator appointment
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: "CreatorPass123!",
      href: "https://example.com/login",
      referrer: "https://example.com/",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 7: Appoint the member as a junior moderator in the community
  const moderatorAppointment: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: member.id,
          tier: "junior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAppointment);

  // Step 8: Validate the moderator appointment details
  TestValidator.equals(
    "moderator tier should be junior",
    moderatorAppointment.moderator_tier,
    "junior",
  );

  TestValidator.equals(
    "appointed member should match",
    moderatorAppointment.member.id,
    member.id,
  );

  TestValidator.equals(
    "community should match",
    moderatorAppointment.community.id,
    community.id,
  );

  TestValidator.predicate(
    "appointed_at timestamp should be set",
    moderatorAppointment.appointed_at !== null &&
      moderatorAppointment.appointed_at !== undefined,
  );

  TestValidator.predicate(
    "moderator should be active (removed_at is null)",
    moderatorAppointment.removed_at === null,
  );

  TestValidator.equals(
    "created_at should be set",
    typeof moderatorAppointment.created_at,
    "string",
  );
}
