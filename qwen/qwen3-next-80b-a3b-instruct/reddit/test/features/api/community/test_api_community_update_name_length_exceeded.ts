import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

/**
 * Validate community name update rejection when name exceeds maximum length of
 * 100 characters.
 *
 * This test follows a complete business workflow:
 *
 * 1. Authenticate as a member by joining with valid credentials
 * 2. Create a community with a valid name (within 100-character limit)
 * 3. Validate the community creation
 * 4. Re-authenticate as the same member (establishing context)
 * 5. Attempt to update the community name to exceed the 100-character limit (101
 *    characters)
 * 6. Validate that the server rejects the request with a 400 Bad Request error
 *
 * The test verifies the system correctly enforces the 100-character maximum
 * length constraint for community names as defined in the
 * ICommunityPlatformCommunity.ICreate and IUpdate schemas. This is a critical
 * business rule that ensures display compatibility and consistent user
 * interface presentation.
 *
 * Note: Since the API doesn't return HTTP status codes directly, we validate
 * this by ensuring the update operation throws an error, which according to the
 * API specification, should be an HttpError with status 400 when the name
 * exceeds the maximum length.
 */
export async function test_api_community_update_name_length_exceeded(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member by joining with valid credentials
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "ValidPassword123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a community with a valid name (within 100-character limit)
  const communityName: string = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 5,
    wordMax: 8,
  });
  // Ensure the name is under 100 characters by using the truncation function
  const shortCommunityName = communityName.substring(0, 50);

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: shortCommunityName,
          description: RandomGenerator.content({ paragraphs: 1 }),
          tags: ArrayUtil.repeat(2, () => RandomGenerator.alphaNumeric(5)),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Validate the community creation
  TestValidator.equals(
    "community name matches",
    community.name,
    shortCommunityName,
  );

  // 4. Re-authenticate as the same member to ensure session context
  // This is explicitly required in the dependencies to establish member context
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "ValidPassword123!",
      href: "https://community-platform.com",
      referrer: "https://community-platform.com",
      ip: "192.168.1.100",
    } satisfies IMember.ICreate,
  });

  // 5. Attempt to update the community name to exceed the 100-character limit (101 characters)
  const longCommunityName: string = RandomGenerator.paragraph({
    sentences: 15,
    wordMin: 6,
    wordMax: 10,
  });
  // Ensure the name is over 100 characters by creating a very long string
  const exceedingCommunityName = longCommunityName.substring(0, 101);

  // 6. Validate that the server rejects the request with a 400 Bad Request error
  await TestValidator.error(
    "community name exceeding max length should throw error",
    async () => {
      await api.functional.communityPlatform.member.communities.update(
        connection,
        {
          communityCode: community.code,
          body: {
            name: exceedingCommunityName,
          } satisfies ICommunityPlatformCommunity.IUpdate,
        },
      );
    },
  );
}
