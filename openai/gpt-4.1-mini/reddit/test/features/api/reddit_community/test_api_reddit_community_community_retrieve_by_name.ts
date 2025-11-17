import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_reddit_community_community_retrieve_by_name(
  connection: api.IConnection,
) {
  // 1. Create registered user account by joining the platform
  const registeredUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: `${RandomGenerator.name(2).toLowerCase().replace(/\s+/g, "")}@example.com`,
        password: "P@ssw0rd1234",
      } satisfies IRedditCommunityRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // 2. Authenticated user creates a reddit community
  const communityName = `community${RandomGenerator.alphaNumeric(8)}`;
  const createBody = {
    communityName: communityName,
    displayName: RandomGenerator.name(3),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    imageUrl: `https://picsum.photos/seed/${communityName}/200/200`,
    isPrivate: false,
  } satisfies IRedditCommunityCommunity.ICreate;

  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdCommunity);

  // 3. Retrieve community info by communityName (no auth required for retrieval)
  const retrievedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.redditCommunity.communities.at(
      connection,
      {
        communityName: communityName,
      },
    );
  typia.assert(retrievedCommunity);

  // 4. Validate that retrieved community matches created community data
  TestValidator.equals(
    "communityName matches",
    retrievedCommunity.communityName,
    createBody.communityName,
  );
  TestValidator.equals(
    "displayName matches",
    retrievedCommunity.displayName,
    createBody.displayName,
  );
  TestValidator.equals(
    "description matches",
    retrievedCommunity.description,
    createBody.description,
  );
  TestValidator.equals(
    "imageUrl matches",
    retrievedCommunity.imageUrl ?? null,
    createBody.imageUrl ?? null,
  );
  TestValidator.equals(
    "isPrivate flag matches",
    retrievedCommunity.isPrivate,
    createBody.isPrivate,
  );

  // 5. Validate createdAt is a valid ISO datetime string and not empty
  TestValidator.predicate(
    "createdAt is ISO datetime string",
    typeof retrievedCommunity.createdAt === "string" &&
      retrievedCommunity.createdAt.length > 0,
  );
}
