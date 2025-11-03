import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate that an authenticated user (member) can retrieve detailed
 * information about a specific moderator assignment in a community.
 *
 * Steps:
 *
 * 1. Register a new user via join (with unique email).
 * 2. User creates a new community (unique name/description).
 * 3. User assigns themselves as a moderator in that community.
 * 4. User retrieves the details of the moderator assignment by communityId and
 *    moderatorId.
 * 5. Validate that returned moderator record includes correct user and community
 *    references, and a non-empty assignment timestamp.
 * 6. Attempt to fetch a non-existent moderatorId and expect not found error.
 */
export async function test_api_community_moderator_details_access_by_member(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const registrationBody = {
    email,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformUser.IJoin;
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: registrationBody });
  typia.assert(user);

  // 2. User creates a new community
  const communityBody = {
    name: RandomGenerator.alphabets(12).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 7 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3. User assigns themselves as moderator in the community
  const moderatorBody = {
    user_id: user.id,
  } satisfies ICommunityPlatformCommunityModerator.ICreate;
  const moderator: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.user.communities.moderators.create(
      connection,
      { communityId: community.id, body: moderatorBody },
    );
  typia.assert(moderator);

  // 4. Retrieve moderator assignment details
  const modFetched: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.user.communities.moderators.at(
      connection,
      { communityId: community.id, moderatorId: moderator.id },
    );
  typia.assert(modFetched);
  TestValidator.equals(
    "moderator record id matches",
    modFetched.id,
    moderator.id,
  );
  TestValidator.equals(
    "moderator assignment user id matches",
    modFetched.user.id,
    user.id,
  );
  TestValidator.equals(
    "moderator assignment community id matches",
    modFetched.community.id,
    community.id,
  );
  TestValidator.predicate(
    "assigned_at is non-empty",
    typeof modFetched.assigned_at === "string" &&
      modFetched.assigned_at.length > 0,
  );

  // 5. Attempt to fetch moderator record using non-existent moderatorId
  await TestValidator.error(
    "fetching non-existent moderatorId throws",
    async () => {
      await api.functional.communityPlatform.user.communities.moderators.at(
        connection,
        {
          communityId: community.id,
          moderatorId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
