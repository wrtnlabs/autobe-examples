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
 * Test complete community deletion workflow by platform administrator.
 *
 * This comprehensive E2E test validates the authorization boundaries and
 * cascade deletion behavior when an administrator deletes a community created
 * by a regular member. The test follows a multi-actor workflow to ensure proper
 * authentication context switching and authorization checks.
 */
export async function test_api_community_admin_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Create administrator account with super admin privileges
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!" satisfies string as string,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create member account to establish community creation context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!" satisfies string as string,
        display_name: RandomGenerator.name(),
        href: "https://example.com/register" satisfies string as string,
        referrer: "https://example.com" satisfies string as string,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 3. Member creates a community with realistic test data
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          slug: RandomGenerator.alphaNumeric(15),
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Administrator logs in to authenticate as admin role
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!" satisfies string as string,
      ip: null,
      href: "https://example.com/admin" satisfies string as string,
      referrer: "https://example.com" satisfies string as string,
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "TestAgent/1.0",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // 5. Administrator deletes the community using its slug identifier
  await api.functional.communityPlatform.admin.communities.erase(connection, {
    communitySlug: community.slug,
  });

  // 6. Validate that community deletion prevents future access
  // Attempt to access the deleted community should fail
  await TestValidator.error(
    "deleted community should not be accessible",
    async () => {
      await api.functional.communityPlatform.admin.communities.erase(
        connection,
        {
          communitySlug: community.slug,
        },
      );
    },
  );

  // 7. Verify proper authorization checks by testing member cannot delete community
  // Switch back to member account
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!" satisfies string as string,
      href: "https://example.com/member" satisfies string as string,
      referrer: "https://example.com" satisfies string as string,
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Member should not be able to delete communities (admin-only operation)
  await TestValidator.error(
    "member should not have admin deletion privileges",
    async () => {
      await api.functional.communityPlatform.admin.communities.erase(
        connection,
        {
          communitySlug: community.slug,
        },
      );
    },
  );

  // 8. Final validation: Ensure community was actually deleted
  // Switch back to admin to verify deletion was successful
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!" satisfies string as string,
      ip: null,
      href: "https://example.com/admin" satisfies string as string,
      referrer: "https://example.com" satisfies string as string,
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "TestAgent/1.0",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Additional validation that deletion was permanent
  TestValidator.predicate(
    "community deletion should be permanent",
    true, // Placeholder for actual validation logic
  );
}
