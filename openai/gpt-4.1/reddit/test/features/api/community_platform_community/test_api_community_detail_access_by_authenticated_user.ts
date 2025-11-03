import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate that an authenticated user can access community detail by unique
 * identifier and that error scenarios (non-existent or soft-deleted
 * communities) are handled properly.
 *
 * Steps:
 *
 * 1. Register a new user (ICommunityPlatformUser.IJoin) - receive
 *    ICommunityPlatformUser.IAuthorized
 * 2. Create a new community using that user (ICommunityPlatformCommunity.ICreate)
 * 3. Retrieve the community detail by its id (ICommunityPlatformCommunity)
 * 4. Validate all required fields (unique name, description, creator_user_id,
 *    created_at, deleted_at is null)
 * 5. Attempt to access a non-existent community ID and expect error
 * 6. (Optional, if API supports soft deletion) Simulate/mark community as deleted
 *    (not available in API, so skip actual delete step), then attempt to access
 *    it and expect error
 */
export async function test_api_community_detail_access_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: "https://test.com/register",
    referrer: "https://test.com/",
  } satisfies ICommunityPlatformUser.IJoin;
  const authorizedUser = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(authorizedUser);
  TestValidator.equals(
    "email matches in auth response",
    authorizedUser.email,
    joinBody.email,
  );
  TestValidator.equals(
    "display_name matches in auth response",
    authorizedUser.display_name,
    joinBody.display_name,
  );
  TestValidator.predicate(
    "user id is a uuid",
    typeof authorizedUser.id === "string" && authorizedUser.id.length === 36,
  );
  TestValidator.equals(
    "deleted_at is null after join",
    authorizedUser.deleted_at,
    null,
  );
  TestValidator.predicate(
    "token should exist after join",
    typeof authorizedUser.token === "object" && !!authorizedUser.token.access,
  );

  // 2. Create a new community (must be authenticated as the above user)
  const createCommunityBody = {
    name: RandomGenerator.alphabets(15).toLowerCase(),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const createdCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: createCommunityBody,
    });
  typia.assert(createdCommunity);
  TestValidator.equals(
    "community name matches request",
    createdCommunity.name,
    createCommunityBody.name,
  );
  TestValidator.equals(
    "community description matches input",
    createdCommunity.description,
    createCommunityBody.description,
  );
  TestValidator.equals(
    "creator_user_id is user's id",
    createdCommunity.creator_user_id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "deleted_at is null for active community",
    createdCommunity.deleted_at,
    null,
  );

  // 3. Retrieve community detail with its id
  const communityDetail =
    await api.functional.communityPlatform.user.communities.at(connection, {
      communityId: createdCommunity.id,
    });
  typia.assert(communityDetail);
  TestValidator.equals(
    "fetched community id matches",
    communityDetail.id,
    createdCommunity.id,
  );
  TestValidator.equals(
    "fetched name matches",
    communityDetail.name,
    createCommunityBody.name,
  );
  TestValidator.equals(
    "fetched creator_user_id matches",
    communityDetail.creator_user_id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "fetched description matches",
    communityDetail.description,
    createCommunityBody.description,
  );
  TestValidator.equals(
    "deleted_at remains null for active",
    communityDetail.deleted_at,
    null,
  );
  TestValidator.predicate(
    "created_at string looks valid",
    typeof communityDetail.created_at === "string" &&
      communityDetail.created_at.length > 0,
  );

  // 4. Try error case: access with random non-existent community id
  await TestValidator.error(
    "accessing non-existent community throws error",
    async () => {
      await api.functional.communityPlatform.user.communities.at(connection, {
        communityId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 5. (No soft-delete endpoint exposed, skip deleted community case)
}
