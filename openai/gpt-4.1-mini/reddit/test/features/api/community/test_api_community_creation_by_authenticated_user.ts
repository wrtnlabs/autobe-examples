import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_creation_by_authenticated_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: User registration and login to obtain authenticated connection
  const baseUserConnection: api.IConnection = { host: connection.host };
  const userAuth: ICommunityPlatformUser.IAuthorized =
    await authorize_user_join(baseUserConnection, {
      body: {
        email: RandomGenerator.alphaNumeric(8) + "@test.com",
        password: "testPassword123",
        username: RandomGenerator.alphabets(8),
        displayName: RandomGenerator.name(2),
        href: "https://example.com",
        referrer: "https://referrer.com",
        ip: null,
      },
    });
  // Create userConnection with authentication header
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: userAuth.token.access },
  };
  // Step 2: Try to create a community with valid unique name, description and iconUrl
  const communityCreateBody: ICommunityPlatformCommunity.ICreate = {
    name: `community_${RandomGenerator.alphabets(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    iconUrl: `https://example.com/icons/${RandomGenerator.alphabets(6)}.png`,
  };
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: communityCreateBody,
      },
    );
  // Validate the response structure and values
  typia.assert(community);
  TestValidator.predicate(
    "Community ID is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      community.id,
    ),
  );
  TestValidator.equals(
    "Community name matches input",
    community.name,
    communityCreateBody.name,
  );
  TestValidator.equals(
    "Community description matches input",
    community.description,
    communityCreateBody.description,
  );
  TestValidator.equals(
    "Community iconUrl matches input",
    community.iconUrl,
    communityCreateBody.iconUrl,
  );
  // Changed subscriberCount check to handle boolean type: expect false initially
  TestValidator.predicate(
    "Subscriber count initialized to false (zero equivalent)",
    community.subscriberCount === false,
  );
  TestValidator.predicate(
    "CreatedAt timestamp valid ISO date",
    !isNaN(Date.parse(community.createdAt)),
  );
  TestValidator.predicate(
    "UpdatedAt timestamp valid ISO date",
    !isNaN(Date.parse(community.updatedAt)),
  );
  TestValidator.predicate(
    "Owner user ID matches authenticated user ID",
    community.ownerUser.id === userAuth.id,
  );
  // Step 3: Attempt to create community without authentication => expect failure
  await TestValidator.error(
    "Unauthorized user cannot create community",
    async () => {
      const unauthorizedCreateBody: ICommunityPlatformCommunity.ICreate = {
        name: `unauth_${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        iconUrl: `https://example.com/icons/${RandomGenerator.alphabets(4)}.png`,
      };
      await api.functional.communityPlatform.user.communities.create(
        connection,
        {
          body: unauthorizedCreateBody,
        },
      );
    },
  );
}
