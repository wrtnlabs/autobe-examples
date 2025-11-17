import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_reddit_community_registered_user_update_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Register a new user via join to obtain authorized token (authentication)
  const createBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "ValidPassword123!",
  } satisfies IRedditCommunityRegisteredUser.ICreate;
  const authorized: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // 2. Create a registered user record under redditCommunity via create
  // Use email matching authorized user for consistency
  const createRegUserBody = {
    email: authorized.email,
    password: "ValidPassword123!", // while the SDK expects password hash, spec states password is hashed server-side
  } satisfies IRedditCommunityRegisteredUser.ICreate;
  const regUser: IRedditCommunityRegisteredUser =
    await api.functional.redditCommunity.redditCommunityRegisteredusers.create(
      connection,
      {
        body: createRegUserBody,
      },
    );
  typia.assert(regUser);

  // 3. Now authenticated updates the registered user identified by regUser.id
  // Update email to a new unique email, and optionally set deleted_at
  const updatedEmail = RandomGenerator.alphaNumeric(10) + "@updated.com";

  // Build update body, leaving deleted_at as null (active account)
  const updateBody = {
    email: updatedEmail,
    deleted_at: null,
  } satisfies IRedditCommunityRegisteredUser.IUpdate;

  const updatedUser: IRedditCommunityRegisteredUser =
    await api.functional.redditCommunity.registeredUser.redditCommunityRegisteredusers.update(
      connection,
      {
        id: regUser.id,
        body: updateBody,
      },
    );
  typia.assert(updatedUser);

  // 4. Validate that the updated user has expected properties
  TestValidator.equals("updated user ID matches", updatedUser.id, regUser.id);
  TestValidator.equals("updated email is set", updatedUser.email, updatedEmail);
  TestValidator.equals(
    "deleted_at is null for active account",
    updatedUser.deleted_at,
    null,
  );

  // 5. Validate timestamps: updated_at should be after created_at
  TestValidator.predicate(
    "updated_at should be newer or equal to created_at",
    new Date(updatedUser.updated_at) >= new Date(updatedUser.created_at),
  );
}
