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

export async function test_api_community_creation_duplicate_name_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate first user
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(user1);
  // Step 2: Create a community with a specific name using first user
  const communityName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 5,
  });
  const communityDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 1,
    sentenceMax: 3,
  });
  const firstCommunity =
    await generate_random_community_platform_user_communities_create(
      user1Connection,
      {
        body: {
          name: communityName,
          description: communityDescription,
        },
      },
    );
  typia.assert(firstCommunity);
  TestValidator.equals(
    "community name matches",
    firstCommunity.name,
    communityName,
  );
  // Step 3: Create and authenticate second user
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(user2);
  // Step 4: Attempt to create duplicate community with same name using second user
  await TestValidator.error(
    "duplicate community name should be rejected",
    async () => {
      await generate_random_community_platform_user_communities_create(
        user2Connection,
        {
          body: {
            name: communityName,
            description: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 1,
              sentenceMax: 3,
            }),
          },
        },
      );
    },
  );
}
