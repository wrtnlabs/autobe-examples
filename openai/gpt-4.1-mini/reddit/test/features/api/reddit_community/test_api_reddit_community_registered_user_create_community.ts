import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_reddit_community_registered_user_create_community(
  connection: api.IConnection,
) {
  // Step 1: Register a new user with realistic join data
  const joinBody = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://google.com",
  } satisfies IRedditCommunityRegisteredUser.IJoin;

  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(user);

  // Step 2: Create a new community with required fields and valid values
  const communityBody = {
    communityName: `${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    status: "active",
  } satisfies IRedditCommunityCommunity.ICreate;

  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );

  typia.assert(createdCommunity);

  // Assertions for data integrity
  TestValidator.equals(
    "communityName matches",
    createdCommunity.communityName,
    communityBody.communityName,
  );
  TestValidator.equals(
    "description matches",
    createdCommunity.description,
    communityBody.description,
  );
  TestValidator.equals("status is active", createdCommunity.status, "active");
  TestValidator.predicate(
    "creator_id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      createdCommunity.creator_id,
    ),
  );
}
