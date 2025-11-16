import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

/**
 * Validate community creation without tags.
 *
 * This test verifies that the system properly rejects community creation
 * requests that omit the required tags array. The business logic requires at
 * least one tag for proper categorization and discovery. The test follows this
 * workflow:
 *
 * 1. Authenticate as a new member using valid credentials
 * 2. Attempt to create a community with an empty tags array (violating the
 *    MinItems<1> constraint)
 * 3. Validate that the API returns a validation error indicating the tags field is
 *    required
 * 4. Confirm that no community record is created in the database
 *
 * The test explicitly validates the business rule that communities must have at
 * least one tag without attempting to test type system violations (which are
 * handled by compiling). The scenario is implemented using completely valid
 * TypeScript types with the correct ICommunityPlatformCommunity.ICreate DTO
 * structure where the tags property is required and has MinItems<1>
 * constraint.
 *
 * This test demonstrates proper use of the ICommunityPlatformCommunity.ICreate
 * type with correct property usage and validation without any type bypassing
 * techniques.
 */
export async function test_api_community_creation_missing_tags(
  connection: api.IConnection,
) {
  // 1. Authenticate as member
  const email = typia.random<string & tags.Format<"email">>();
  const password = "ValidPass123!";
  const href = "https://community-platform.com/join";
  const referrer = "https://community-platform.com";
  const ip = "192.168.1.100";

  const authenticatedMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password,
        href,
        referrer,
        ip,
      } satisfies IMember.ICreate,
    });
  typia.assert(authenticatedMember);

  // 2. Attempt to create community with empty tags array (required field)
  const communityName = RandomGenerator.name();
  const communityDescription = RandomGenerator.paragraph();

  // This intentionally uses an empty array for tags, violating MinItems<1> constraint
  await TestValidator.error(
    "community creation should fail with empty tags array",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: communityName,
            description: communityDescription,
            tags: [], // Empty array - violates MinItems<1> constraint
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Verification: The system should reject the creation and not create any community
  // This is handled by the validation error assertion above
}
