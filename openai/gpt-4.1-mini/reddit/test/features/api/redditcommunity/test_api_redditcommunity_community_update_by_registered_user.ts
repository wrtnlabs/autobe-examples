import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_redditcommunity_community_update_by_registered_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Registered user joins (creates account and authenticates)
  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(10)}@test.com`,
        password: "SecurePass123!",
      } satisfies IRedditCommunityRegisteredUser.ICreate,
    });
  typia.assert(user);

  // 2. Registered user creates a community
  const communityCreateBody = {
    communityName: `community_${RandomGenerator.alphaNumeric(5)}`,
    displayName: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 4,
      wordMax: 8,
    }),
    imageUrl: `https://example.com/${RandomGenerator.alphaNumeric(8)}.png`,
    isPrivate: false,
  } satisfies IRedditCommunityCommunity.ICreate;

  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(createdCommunity);

  TestValidator.equals(
    "communityName of created community equals input",
    createdCommunity.communityName,
    communityCreateBody.communityName,
  );

  // 3. Registered user updates the community
  const communityUpdateBody: IRedditCommunityCommunity.IUpdate = {
    displayName: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 5,
      wordMax: 10,
    }),
    imageUrl: `https://images.example.com/${RandomGenerator.alphaNumeric(8)}.jpg`,
  };

  const updatedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.update(
      connection,
      {
        communityName: createdCommunity.communityName,
        body: communityUpdateBody,
      },
    );
  typia.assert(updatedCommunity);

  TestValidator.equals(
    "communityName remains the same after update",
    updatedCommunity.communityName,
    createdCommunity.communityName,
  );
  TestValidator.equals(
    "displayName updated",
    updatedCommunity.displayName,
    communityUpdateBody.displayName!,
  );
  TestValidator.equals(
    "description updated",
    updatedCommunity.description,
    communityUpdateBody.description!,
  );
  TestValidator.equals(
    "imageUrl updated",
    updatedCommunity.imageUrl,
    communityUpdateBody.imageUrl,
  );
  TestValidator.equals(
    "isPrivate remains unchanged",
    updatedCommunity.isPrivate,
    createdCommunity.isPrivate,
  );
}
