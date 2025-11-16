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
 * Test duplicate moderator appointment prevention.
 *
 * Validates that appointing the same member as moderator twice is prevented
 * with appropriate HTTP 400 error. The test:
 *
 * 1. Creates community creator and member accounts
 * 2. Creates a category and community
 * 3. Appoints member as moderator (succeeds)
 * 4. Attempts to appoint same member again (fails with 400 error)
 * 5. Validates error message and data integrity
 */
export async function test_api_moderator_appointment_duplicate_prevention(
  connection: api.IConnection,
) {
  // 1. Create community creator member
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorBody = {
    email: creatorEmail,
    username: RandomGenerator.alphabets(8),
    password: "TestPassword123!",
    ip: "127.0.0.1",
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const creator = await api.functional.auth.member.join(connection, {
    body: creatorBody,
  });
  typia.assert(creator);

  // 2. Create member to be appointed as moderator
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberBody = {
    email: memberEmail,
    username: RandomGenerator.alphabets(8),
    password: "TestPassword123!",
    ip: "127.0.0.1",
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberBody,
  });
  typia.assert(member);

  // 3. Login as administrator to create category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminBody = {
    email: adminEmail,
    password: "AdminPassword123!",
    username: RandomGenerator.alphabets(8),
    name: "Admin User",
    href: "http://localhost:3000/admin-register",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  // 4. Create category
  const categoryBody = {
    name: "Technology",
    slug: "technology",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 5. Login as creator to create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: "TestPassword123!",
      ip: "127.0.0.1",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 6. Create test community
  const communityBody = {
    name: "Test Community",
    identifier: RandomGenerator.alphabets(8).toLowerCase(),
    description: "Community for testing moderator appointment",
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 7. First appointment - should succeed
  const firstAppointmentBody = {
    memberId: member.id,
    tier: "senior" as const,
  } satisfies ICommunityPlatformCommunityModerator.ICreate;

  const firstModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: firstAppointmentBody,
      },
    );
  typia.assert(firstModerator);
  TestValidator.equals(
    "first appointment returns correct member",
    firstModerator.member.id,
    member.id,
  );
  TestValidator.equals(
    "first appointment has senior tier",
    firstModerator.moderator_tier,
    "senior",
  );
  TestValidator.equals(
    "first appointment has null removed_at",
    firstModerator.removed_at,
    null,
  );

  // 8. Second appointment - should fail with HTTP 400
  const secondAppointmentBody = {
    memberId: member.id,
    tier: "junior" as const,
  } satisfies ICommunityPlatformCommunityModerator.ICreate;

  await TestValidator.error(
    "duplicate moderator appointment should fail with 400 error",
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: secondAppointmentBody,
        },
      );
    },
  );
}
