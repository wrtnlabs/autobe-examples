import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

/**
 * This E2E test verifies the community creation feature by a registeredUser. It
 * ensures that only authenticated registered users can create new communities
 * with valid data.
 *
 * The test includes the following steps:
 *
 * 1. Register a new user (join) with valid email, password, and session info.
 * 2. Assert the issued authorization token and user data correctness.
 * 3. Create a new community with a unique name, description, and status.
 * 4. Assert the community creation success, response correctness, and data
 *    integrity.
 *
 * All validations use typia.assert() for runtime type safety, and detailed
 * TestValidator validations for correctness assertions.
 *
 * This test covers the basic positive path ensuring the API contracts are met.
 */
export async function test_api_community_creation_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = `${RandomGenerator.alphabets(5)}@example.com`;
  const joinBody = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email,
    password: "TestPass123!",
    href: "https://example.com/signup",
    referrer: "https://example.com/home",
    ip: null,
  } satisfies IRedditCommunityRegisteredUser.IJoin;

  const joinedUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedUser);

  // Assert tokens and user fields
  TestValidator.predicate(
    "authorization token access is issued",
    typeof joinedUser.token.access === "string" &&
      joinedUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "authorization token refresh is issued",
    typeof joinedUser.token.refresh === "string" &&
      joinedUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "user id is valid UUID",
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      joinedUser.id,
    ),
  );
  TestValidator.equals("user email matches input", joinedUser.email, email);
  TestValidator.predicate(
    "user status is valid",
    ["active", "inactive", "banned"].includes(joinedUser.status),
  );

  // 2. Create a new community
  // Compose a unique communityName
  const communityName = `community_${RandomGenerator.alphaNumeric(8)}`;
  // Random status from enum
  const status = RandomGenerator.pick(["active", "inactive"] as const);
  const communityCreateBody = {
    communityName,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 12,
    }),
    status,
  } satisfies IRedditCommunityCommunity.ICreate;

  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(createdCommunity);

  // Assert returned community data
  TestValidator.equals(
    "created community name matches input",
    createdCommunity.communityName,
    communityCreateBody.communityName,
  );
  TestValidator.equals(
    "created community description matches input",
    createdCommunity.description,
    communityCreateBody.description,
  );
  TestValidator.equals(
    "created community status matches input",
    createdCommunity.status,
    communityCreateBody.status,
  );

  // Validate id is valid UUID
  TestValidator.predicate(
    "created community id is valid UUID",
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      createdCommunity.id,
    ),
  );
  // Validate creator_id matches user id
  TestValidator.equals(
    "community creator id matches user id",
    createdCommunity.creator_id,
    joinedUser.id,
  );
}
