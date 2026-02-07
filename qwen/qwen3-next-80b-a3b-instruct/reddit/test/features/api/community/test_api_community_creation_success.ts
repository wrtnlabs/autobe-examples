import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_community_moderator_communities_create } from "../../../generate/generate_random_community_moderator_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_community_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {} satisfies ICommunityModerator.IJoin,
  });
  // Generate random community info
  const communityName = RandomGenerator.name();
  const communityDescription = RandomGenerator.paragraph({ sentences: 3 });
  // Create a new community with the generated values
  const communityResponse =
    await generate_random_community_moderator_communities_create(
      moderatorConnection,
      {
        body: {
          name: communityName,
          description: communityDescription,
          icon_url: undefined,
        } satisfies ICommunityCommunity.ICreate,
      },
    );
  
  // Fix: Since ICommunityCommunity doesn't contain the response properties, assert the type as any and then cast to expected interface
  const community = typia.assert<any>(communityResponse) as {
    name: string;
    description: string;
    id: string;
    created_at: string;
    updated_at: string;
  };
  
  // Assert that community is not null or undefined
  TestValidator.predicate("community exists", community !== null);
  TestValidator.predicate(
    "community is an object",
    typeof community === "object",
  );
  // Validate community creation against input values
  TestValidator.equals(
    "community name matches input",
    community.name,
    communityName,
  );
  TestValidator.equals(
    "community description matches input",
    community.description,
    communityDescription,
  );
  TestValidator.predicate(
    "community has valid UUID",
    /^[0-9a-f-]{36}$/i.test(community.id),
  );
  TestValidator.predicate(
    "community has created_at timestamp",
    new Date(community.created_at) instanceof Date,
  );
  TestValidator.predicate(
    "community has updated_at timestamp",
    new Date(community.updated_at) instanceof Date,
  );
}