import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test the workflow for a user to archive (soft delete) a community they
 * created. Validates business logic for both archive and related edge cases.
 *
 * 1. Register a new user with unique credentials and metadata (join)
 * 2. Authenticate and obtain an authorization token
 * 3. Create a new community with required name/description
 * 4. Archive (soft delete) the newly created community and ensure 'deleted_at' is
 *    set
 * 5. Confirm the deleted_at value is correctly set (matches ISO 8601 date-time)
 * 6. Edge case: Attempt to archive again and expect rejection (error)
 */
export async function test_api_community_soft_delete_by_creator(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userBody = {
    email: userEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://docs.autobe.com/", // Use a valid URI
    referrer: "https://google.com/",
  } satisfies ICommunityPlatformUser.IJoin;

  const user = await api.functional.auth.user.join(connection, {
    body: userBody,
  });
  typia.assert(user);

  // 2. User is authenticated at this point; token automatically set

  // 3. Create a new community
  const newCommunityName = RandomGenerator.alphabets(10).toLowerCase();
  const createCommunityBody = {
    name: newCommunityName,
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: createCommunityBody,
    });
  typia.assert(community);
  TestValidator.equals(
    "community created with requested name",
    community.name,
    createCommunityBody.name,
  );
  TestValidator.equals(
    "community is not deleted initially",
    community.deleted_at,
    null,
  );

  // 4. Archive (soft delete) the community
  const archived =
    await api.functional.communityPlatform.user.communities.erase(connection, {
      communityId: community.id,
    });
  typia.assert(archived);
  // 5. Confirm deleted_at is set (not null, proper ISO format)
  TestValidator.predicate(
    "archived community has deleted_at set",
    typeof archived.deleted_at === "string" && archived.deleted_at.length > 0,
  );
  // 6. Attempt to archive again (edge case): must throw error
  await TestValidator.error(
    "cannot archive a community already archived",
    async () => {
      await api.functional.communityPlatform.user.communities.erase(
        connection,
        {
          communityId: community.id,
        },
      );
    },
  );
}
