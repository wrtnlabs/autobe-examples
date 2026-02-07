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

export async function test_api_community_creation_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator to create first community
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, { body: {} });
  // 2. Create first community with unique name
  const firstCommunityName = RandomGenerator.name();
  const firstCommunity =
    await generate_random_community_moderator_communities_create(
      moderatorConnection,
      {
        body: {
          name: firstCommunityName,
        } satisfies ICommunityCommunity.ICreate,
      },
    );
  typia.assert(firstCommunity);
  // 3. Create second community with duplicate name - expect business error
  await TestValidator.error("duplicate community name", async () => {
    await generate_random_community_moderator_communities_create(
      moderatorConnection,
      {
        body: {
          name: firstCommunityName,
        } satisfies ICommunityCommunity.ICreate,
      },
    );
  });
}
