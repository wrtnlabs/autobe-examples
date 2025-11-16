import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_registered_user_create_community(
  connection: api.IConnection,
) {
  // 1. Register a new user using the registeredUser join endpoint
  const joinBody = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: `https://${RandomGenerator.alphabets(8)}.com${new URL(connection.host).pathname}/`,
    referrer: `https://${RandomGenerator.alphabets(8)}.com/`,
    ip: null,
  } satisfies IRedditCommunityRegisteredUser.IJoin;

  const authorizedUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedUser);

  // 2. Create a new community with valid data, authorized as the registered user
  // Use unique communityName by combining random word plus a timestamp
  const uniqueCommunityName = `community_${RandomGenerator.alphaNumeric(6)}_${Date.now()}`;

  const communityCreateBody = {
    communityName: uniqueCommunityName,
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 4,
      wordMax: 10,
    }),
    status: "active",
  } satisfies IRedditCommunityCommunity.ICreate;

  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(createdCommunity);

  // 3. Validate the created community's properties
  TestValidator.equals(
    "communityName should match input",
    createdCommunity.communityName,
    uniqueCommunityName,
  );
  TestValidator.equals(
    "community status is active",
    createdCommunity.status,
    "active",
  );

  // Validate creator_id matches the authenticated user id
  TestValidator.equals(
    "creator_id matches authorized user id",
    createdCommunity.creator_id,
    authorizedUser.id,
  );

  // Validate timestamps are valid ISO 8601 strings
  typia.assert<string & tags.Format<"date-time">>(createdCommunity.created_at);
  typia.assert<string & tags.Format<"date-time">>(createdCommunity.updated_at);

  // deleted_at should be null or undefined (not present or null)
  if (createdCommunity.deleted_at !== undefined) {
    TestValidator.equals(
      "deleted_at is null if present",
      createdCommunity.deleted_at,
      null,
    );
  }
}
