import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_reddit_community_update_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new registered user
  const joinBody = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: `user${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Password123!",
    href: "https://example.com/register",
    referrer: "https://example.com/",
  } satisfies IRedditCommunityRegisteredUser.IJoin;

  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(user);

  // 2. Create a new community
  const newCommunityName = `community_${RandomGenerator.alphaNumeric(6)}`;
  const createBody = {
    communityName: newCommunityName,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 6,
      wordMax: 10,
    }),
    status: "active",
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "communityName unchanged after creation",
    community.communityName,
    newCommunityName,
  );
  TestValidator.equals(
    "status is active after creation",
    community.status,
    "active",
  );

  // 3. Update the community's description and status
  // Toggle status to inactive for testing update
  const updateBody = {
    description: RandomGenerator.paragraph({
      sentences: 7,
      wordMin: 4,
      wordMax: 8,
    }),
    status: community.status === "active" ? "inactive" : "active",
    deleted_at: null,
  } satisfies IRedditCommunityCommunity.IUpdate;

  const updatedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.communities.update(
      connection,
      {
        communityName: newCommunityName,
        body: updateBody,
      },
    );
  typia.assert(updatedCommunity);
  TestValidator.equals(
    "communityName unchanged after update",
    updatedCommunity.communityName,
    newCommunityName,
  );
  TestValidator.equals(
    "description updated",
    updatedCommunity.description,
    updateBody.description,
  );
  TestValidator.equals(
    "status updated",
    updatedCommunity.status,
    updateBody.status,
  );
}
