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
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_create_minimal_valid_data_success(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate user via join operation
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, { body: {} });
  typia.assert(userAuth);
  // Update userConnection headers for authorization
  userConnection.headers = {
    ...userConnection.headers,
    Authorization: `Bearer ${userAuth.token.access}`,
  };
  // Generate needed string values first
  const name = RandomGenerator.name(2);
  const description = RandomGenerator.paragraph({ sentences: 2 });
  const icon_url = `https://example.com/icons/${RandomGenerator.alphabets(10)}.png`;
  // Prepare minimal valid community create data using constants
  const communityCreateBody: ICommunityPlatformCommunity.ICreate = {
    name,
    description,
    icon_url,
  };
  // Create community using generation utility
  const communityRaw =
    await generate_random_community_platform_user_communities_create_community(
      userConnection,
      {
        body: communityCreateBody,
      },
    );
  // Assert response correctness with any as community's type may be complex
  const community = typia.assert<any>(communityRaw);
  // Validate required fields against input using constants
  TestValidator.equals(
    "community name matches",
    community.name,
    name,
  );
  TestValidator.equals(
    "community description matches",
    community.description,
    description,
  );
  TestValidator.equals(
    "community icon_url matches",
    community.icon_url,
    icon_url,
  );
  // Validate owner linkage present
  TestValidator.predicate(
    "community owner_user_id exists",
    typeof community.owner_user_id === "string" &&
      community.owner_user_id.length > 0,
  );
  // Validate timestamps presence and format
  TestValidator.predicate(
    "community created_at is ISO string",
    typeof community.created_at === "string" &&
      community.created_at.match(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/,
      ) !== null,
  );
  TestValidator.predicate(
    "community updated_at is ISO string",
    typeof community.updated_at === "string" &&
      community.updated_at.match(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/,
      ) !== null,
  );
  TestValidator.predicate(
    "community deleted_at is null",
    community.deleted_at === null,
  );
  // Validate UUID format of community id
  TestValidator.predicate(
    "community id is UUID",
    typeof community.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        community.id,
      ),
  );
}
