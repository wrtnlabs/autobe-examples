import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

/**
 * Test updating an existing redditCommunity community's description and
 * properties by an authenticated user.
 *
 * The test verifies the end-to-end flow:
 *
 * 1. Register and authenticate a new user to obtain authorization tokens.
 * 2. Create a new community using authenticated user context.
 * 3. Update the community's description and updated_at timestamp.
 * 4. Validate that the update only modifies mutable fields and timestamps.
 * 5. Confirm immutable fields remain unchanged.
 *
 * This ensures the API correctly enforces authentication, validation, and
 * update behavior.
 */
export async function test_api_community_update_with_user_authentication(
  connection: api.IConnection,
) {
  // Step 1: User registration and authentication via join
  const userCreateBody = {
    email: `user${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "StrongPassword123!",
    ip: null,
    href: "http://localhost",
    referrer: "http://localhost",
  } satisfies IRedditCommunityUser.ICreate;

  const authorizedUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userCreateBody });
  typia.assert(authorizedUser);

  // Step 2: Create a community
  const communityCreateBody = {
    name: `community_${RandomGenerator.alphaNumeric(5)}`,
    description: "Initial community description",
  } satisfies IRedditCommunityCommunity.ICreate;

  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(createdCommunity);

  TestValidator.equals(
    "created community name matches",
    createdCommunity.name,
    communityCreateBody.name,
  );
  TestValidator.equals(
    "created community description matches",
    createdCommunity.description,
    communityCreateBody.description,
  );

  // Step 3: Update community description
  const newDescription = `Updated description at ${new Date().toISOString()}`;
  const updateBody = {
    description: newDescription,
    updated_at: new Date().toISOString(),
  } satisfies IRedditCommunityCommunity.IUpdate;

  const updatedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.update(connection, {
      communityName: createdCommunity.name,
      body: updateBody,
    });
  typia.assert(updatedCommunity);

  TestValidator.equals(
    "updated community name unchanged",
    updatedCommunity.name,
    createdCommunity.name,
  );
  TestValidator.equals(
    "updated community description matches",
    updatedCommunity.description,
    newDescription,
  );

  TestValidator.predicate(
    "updated community updated_at is newer or equal",
    new Date(updatedCommunity.updated_at).getTime() >=
      new Date(createdCommunity.updated_at).getTime(),
  );

  // Step 4: Verify immutable fields unchanged
  TestValidator.equals(
    "id unchanged",
    updatedCommunity.id,
    createdCommunity.id,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedCommunity.created_at,
    createdCommunity.created_at,
  );
}
