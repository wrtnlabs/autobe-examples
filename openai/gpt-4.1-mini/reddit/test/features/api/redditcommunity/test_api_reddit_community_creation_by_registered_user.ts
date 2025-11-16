import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_reddit_community_creation_by_registered_user(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a registered user
  const joinBody = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: `user${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "secureP@ssw0rd",
    ip: null,
    href: `https://reddit.example.com/register`,
    referrer: `https://reddit.example.com/`,
  } satisfies IRedditCommunityRegisteredUser.IJoin;

  const registeredUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(registeredUser);

  // Step 2: Create a unique Reddit community by the authenticated registered user
  const communityName = `community_${RandomGenerator.alphaNumeric(8)}`;
  const createCommunityBody = {
    communityName: communityName,
    description: `This is the community ${communityName} created during E2E test.`,
    status: "active",
  } satisfies IRedditCommunityCommunity.ICreate;

  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      { body: createCommunityBody },
    );
  typia.assert(createdCommunity);

  // Step 3: Validation of the created community returned
  TestValidator.equals(
    "communityName matches",
    createdCommunity.communityName,
    communityName,
  );
  TestValidator.equals(
    "description matches",
    createdCommunity.description,
    createCommunityBody.description,
  );
  TestValidator.equals("status is active", createdCommunity.status, "active");
  TestValidator.equals(
    "creator_id matches registered user id",
    createdCommunity.creator_id,
    registeredUser.id,
  );
  TestValidator.predicate(
    "created_at is ISO date string",
    typeof createdCommunity.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/.test(
        createdCommunity.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is ISO date string",
    typeof createdCommunity.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/.test(
        createdCommunity.updated_at,
      ),
  );
  TestValidator.predicate(
    "deleted_at is null or undefined",
    createdCommunity.deleted_at === null ||
      createdCommunity.deleted_at === undefined,
  );
}
