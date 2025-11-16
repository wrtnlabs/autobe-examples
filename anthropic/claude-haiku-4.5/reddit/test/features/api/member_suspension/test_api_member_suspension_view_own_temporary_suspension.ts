import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSuspension";

export async function test_api_member_suspension_view_own_temporary_suspension(
  connection: api.IConnection,
) {
  // Step 1: Create a member account to be suspended
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const suspendedMember = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(suspendedMember);

  // Step 2: Create an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/admin/register",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: adminData,
    },
  );
  typia.assert(administrator);

  // Step 3: Create a category
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10).toLowerCase(),
    display_order: 1,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(category);

  // Step 4: Create a community
  const communityData = {
    name: RandomGenerator.name(3),
    identifier: RandomGenerator.alphabets(10).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityData },
    );
  typia.assert(community);

  // Step 5: Create a temporary suspension with expires_at 7 days in future
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  // Note: We need a report_decision_id, but for testing purposes we'll use a generated UUID
  // In a real scenario, a moderation decision would exist
  const suspensionData = {
    community_platform_member_id: suspendedMember.id,
    community_platform_report_decision_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    suspension_reason: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    suspended_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  } satisfies ICommunityPlatformMemberSuspension.ICreate;

  const suspension =
    await api.functional.communityPlatform.administrator.memberSuspensions.create(
      connection,
      { body: suspensionData },
    );
  typia.assert(suspension);

  // Step 6: Switch back to member context and retrieve the suspension
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberData.password,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const retrievedSuspension =
    await api.functional.communityPlatform.member.memberSuspensions.at(
      connection,
      { suspensionId: suspension.id },
    );
  typia.assert(retrievedSuspension);

  // Step 7: Validate suspension details match
  TestValidator.equals(
    "suspension ID matches",
    retrievedSuspension.id,
    suspension.id,
  );
  TestValidator.equals(
    "suspended member ID matches",
    retrievedSuspension.community_platform_member_id,
    suspendedMember.id,
  );
  TestValidator.equals(
    "suspension reason matches",
    retrievedSuspension.suspension_reason,
    suspensionData.suspension_reason,
  );

  // Step 8: Verify expiration date is in the future
  const now2 = new Date();
  const retrievedExpiresAt = new Date(retrievedSuspension.expires_at!);
  TestValidator.predicate(
    "expiration date is in the future",
    retrievedExpiresAt.getTime() > now2.getTime(),
  );

  // Step 9: Verify suspension timeline (suspended_at before expires_at)
  const suspendedAtTime = new Date(retrievedSuspension.suspended_at).getTime();
  const expiresAtTime = new Date(retrievedSuspension.expires_at!).getTime();
  TestValidator.predicate(
    "suspended_at is before expires_at",
    suspendedAtTime < expiresAtTime,
  );

  // Validate the difference is approximately 7 days
  const timeDifference = expiresAtTime - suspendedAtTime;
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  TestValidator.predicate(
    "suspension duration is approximately 7 days",
    Math.abs(timeDifference - sevenDaysInMs) < 1000, // Allow 1 second variance
  );
}
