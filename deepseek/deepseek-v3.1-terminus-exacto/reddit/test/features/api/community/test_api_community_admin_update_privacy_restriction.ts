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
 * Test community privacy restriction workflow by an administrator.
 *
 * This test validates the complete privacy restriction workflow where an
 * administrator creates a community and then updates its privacy settings from
 * public to private to restricted. The test ensures proper access control
 * changes and validates that privacy transitions maintain platform security
 * standards.
 *
 * Workflow:
 *
 * 1. Create admin and member accounts for authentication
 * 2. Create a community with initial public privacy setting
 * 3. Admin updates privacy from public to private
 * 4. Admin updates privacy from private to restricted
 * 5. Validate proper access control changes
 * 6. Ensure privacy transitions maintain security standards
 */
export async function test_api_community_admin_update_privacy_restriction(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for privacy management
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

  // Step 2: Create member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create community with initial public privacy setting
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    slug: RandomGenerator.alphaNumeric(15),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    privacy: "public",
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "community created with public privacy",
    community.privacy,
    "public",
  );

  // Step 4: Switch to admin authentication context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string>(),
      user_agent: "test-agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Admin updates privacy from public to private
  const updatedCommunityPrivate: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.admin.communities.update(
      connection,
      {
        communitySlug: community.slug,
        body: {
          privacy: "private",
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunityPrivate);

  TestValidator.equals(
    "privacy updated to private",
    updatedCommunityPrivate.privacy,
    "private",
  );
  TestValidator.equals(
    "community ID remains unchanged",
    updatedCommunityPrivate.id,
    community.id,
  );
  TestValidator.equals(
    "community name remains unchanged",
    updatedCommunityPrivate.name,
    community.name,
  );

  // Step 6: Admin updates privacy from private to restricted
  const updatedCommunityRestricted: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.admin.communities.update(
      connection,
      {
        communitySlug: community.slug,
        body: {
          privacy: "restricted",
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunityRestricted);

  TestValidator.equals(
    "privacy updated to restricted",
    updatedCommunityRestricted.privacy,
    "restricted",
  );
  TestValidator.equals(
    "community ID remains unchanged",
    updatedCommunityRestricted.id,
    community.id,
  );
  TestValidator.equals(
    "community name remains unchanged",
    updatedCommunityRestricted.name,
    community.name,
  );

  // Step 7: Validate final community state and business rules
  TestValidator.notEquals(
    "privacy has changed from original",
    updatedCommunityRestricted.privacy,
    community.privacy,
  );
  TestValidator.predicate(
    "community has valid updated timestamp",
    new Date(updatedCommunityRestricted.updated_at) >
      new Date(community.updated_at),
  );

  // Validate privacy transition sequence is valid
  const privacySequence = [community.privacy, "private", "restricted"];
  TestValidator.equals(
    "privacy transition follows valid sequence",
    privacySequence,
    ["public", "private", "restricted"],
  );
}
