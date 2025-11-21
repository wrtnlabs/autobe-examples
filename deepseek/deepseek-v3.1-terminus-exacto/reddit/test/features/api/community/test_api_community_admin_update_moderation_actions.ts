import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test community moderation actions through administrative updates.
 *
 * This E2E test validates community moderation actions through administrative
 * updates. The test creates a member account to establish a community, then
 * authenticates as an administrator to perform moderation actions such as
 * suspending problematic communities or archiving inactive ones. The test
 * validates administrative oversight capabilities and moderation workflow
 * integration.
 */
export async function test_api_community_admin_update_moderation_actions(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123!";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community as member
  const communityName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const communitySlug = communityName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .substring(0, 21);

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          slug: communitySlug,
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Validate community creation
  TestValidator.equals(
    "community name matches input",
    community.name,
    communityName,
  );
  TestValidator.equals(
    "community slug matches generated",
    community.slug,
    communitySlug,
  );
  TestValidator.equals(
    "community privacy is public",
    community.privacy,
    "public",
  );

  // Step 3: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      admin_level: "moderator",
      is_super_admin: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 4: Authenticate as administrator
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Perform moderation action - suspend the community
  const suspendedCommunity =
    await api.functional.communityPlatform.admin.communities.update(
      connection,
      {
        communitySlug: community.slug,
        body: {
          status: "suspended",
          description: "Community suspended for moderation",
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(suspendedCommunity);

  // Validate suspension was applied
  TestValidator.equals(
    "community status should be suspended",
    suspendedCommunity.status,
    "suspended",
  );
  TestValidator.equals(
    "community description updated",
    suspendedCommunity.description,
    "Community suspended for moderation",
  );
  TestValidator.equals(
    "community ID remains unchanged",
    suspendedCommunity.id,
    community.id,
  );

  // Step 6: Perform another moderation action - archive the community
  const archivedCommunity =
    await api.functional.communityPlatform.admin.communities.update(
      connection,
      {
        communitySlug: community.slug,
        body: {
          status: "archived",
          privacy: "private",
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(archivedCommunity);

  // Validate archiving was applied
  TestValidator.equals(
    "community status should be archived",
    archivedCommunity.status,
    "archived",
  );
  TestValidator.equals(
    "community privacy should be private",
    archivedCommunity.privacy,
    "private",
  );
  TestValidator.equals(
    "community ID remains unchanged",
    archivedCommunity.id,
    community.id,
  );
  TestValidator.notEquals(
    "archived community differs from suspended",
    archivedCommunity,
    suspendedCommunity,
  );
}
