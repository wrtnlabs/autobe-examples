import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

/**
 * Test creating a community with a tag exceeding 30 characters in length. The
 * scenario includes: 1) Authenticating as a member, 2) Attempting to create a
 * community with a tag that is 31 characters long. The test validates that the
 * system returns a 400 Bad Request error, enforcing the 30-character maximum
 * length per tag.
 *
 * This is a business logic validation test for the community creation
 * endpoint's tag length restriction. The test follows the complete user
 * journey: first authenticating as a member, then attempting to create a
 * community with an invalid tag length. The validation focuses on verifying the
 * expected error response when the system's 30-character maximum tag length
 * constraint is violated. This ensures the API properly rejects malformed
 * requests that would break the platform's data integrity rules.
 *
 * The scenario is implemented by:
 *
 * 1. Generating valid member authentication data
 * 2. Performing member join to establish authentication context
 * 3. Creating a community creation request with a 31-character tag (exceeding the
 *    30-character limit)
 * 4. Verifying that the system returns a validation error for the tag length
 *    violation
 *
 * This test confirms that the API properly enforces the tag length constraint
 * defined in the ICommunityPlatformCommunity.ICreate DTO, preventing invalid
 * data from entering the system.
 */
export async function test_api_community_create_tag_too_long(
  connection: api.IConnection,
) {
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "StrongPassword123!";
  const href: string = "https://community-platform.com/join";
  const referrer: string = "https://community-platform.com";
  const ip: string = "192.168.1.100";

  // 1. Authenticate as member
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        href,
        referrer,
        ip,
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // 2. Attempt to create community with tag exceeding 30 characters
  // Generate a 31-character tag (exceeding the 30-character limit)
  const tooLongTag: string = RandomGenerator.alphaNumeric(31); // 31 characters

  // Create community request with the invalid tag
  await TestValidator.error(
    "tag length must not exceed 30 characters",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph(),
            tags: [tooLongTag], // This tag has 31 characters, exceeding the 30-character limit
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );
}
