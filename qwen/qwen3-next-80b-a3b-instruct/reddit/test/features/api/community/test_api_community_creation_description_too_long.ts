import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_admin_communities_create } from "../../../generate/generate_random_community_admin_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_community_creation_description_too_long(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Generate a description that exceeds the 500-character limit
  const extremelyLongDescription: string = RandomGenerator.content({
    paragraphs: 10,
    sentenceMin: 20,
    sentenceMax: 30,
    wordMin: 8,
    wordMax: 15,
  });
  // Validate that our generated description exceeds 500 characters
  if (extremelyLongDescription.length <= 500) {
    throw new Error(
      `Generated description is only ${extremelyLongDescription.length} characters, but must exceed 500 for this test`,
    );
  }
  // 3. Use the utility function to create a community with a description that exceeds 500 characters
  // (This is required per the rules - utility functions have absolute priority over direct SDK calls)
  await TestValidator.httpError(
    "creating community with description over 500 characters should return 400 Bad Request",
    400,
    async () => {
      await generate_random_community_admin_communities_create(
        adminConnection,
        {
          body: {
            name: RandomGenerator.name(3),
            description: extremelyLongDescription,
          },
        },
      );
    },
  );
}
