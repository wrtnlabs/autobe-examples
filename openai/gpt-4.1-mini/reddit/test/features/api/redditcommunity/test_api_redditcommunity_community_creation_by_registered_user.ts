import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_redditcommunity_community_creation_by_registered_user(
  connection: api.IConnection,
) {
  // Step 1: User registration via join
  const userEmail = `user_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const userPassword = "StrongPassword123!";
  const authorizedUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies IRedditCommunityRegisteredUser.ICreate,
    });
  typia.assert(authorizedUser);

  // Step 2: Prepare community creation data
  const uniqueName =
    `community_${RandomGenerator.alphaNumeric(8)}`.toLowerCase();
  const displayName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 7,
  });
  const description = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 12,
    wordMin: 3,
    wordMax: 6,
  });

  const communityBody: IRedditCommunityCommunity.ICreate = {
    communityName: uniqueName,
    displayName: displayName,
    description: description,
    imageUrl: null,
    isPrivate: false,
  } satisfies IRedditCommunityCommunity.ICreate;

  // Step 3: Create the community successfully
  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(createdCommunity);

  TestValidator.equals(
    "communityName should match",
    createdCommunity.communityName,
    uniqueName,
  );
  TestValidator.equals(
    "displayName should match",
    createdCommunity.displayName,
    communityBody.displayName,
  );
  TestValidator.equals(
    "description should match",
    createdCommunity.description,
    communityBody.description,
  );
  TestValidator.equals(
    "imageUrl should be null",
    createdCommunity.imageUrl,
    null,
  );
  TestValidator.equals(
    "isPrivate flag should be false",
    createdCommunity.isPrivate,
    false,
  );

  // Step 4: Attempt creation with duplicate name to validate uniqueness enforcement
  await TestValidator.error("duplicate communityName should fail", async () => {
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  });

  // Step 5: Attempt community creation without authentication
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized community creation should fail",
    async () => {
      await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
        unauthenticatedConnection,
        {
          body: {
            communityName: `unauth_${uniqueName}`,
            displayName: displayName,
            description: description,
            imageUrl: null,
            isPrivate: true,
          } satisfies IRedditCommunityCommunity.ICreate,
        },
      );
    },
  );
}
