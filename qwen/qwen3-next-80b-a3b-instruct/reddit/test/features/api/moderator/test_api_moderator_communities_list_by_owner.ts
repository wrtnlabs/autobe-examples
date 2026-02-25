import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerator";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";

export async function test_api_moderator_communities_list_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_community_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCommunityCommunityOwner.IJoin,
  });
  typia.assert(owner);
  // 2. Retrieve moderator list for the owner (expect empty)
  const ownerModConnection: api.IConnection = { host: connection.host };
  ownerModConnection.headers = { Authorization: owner.token.access };
  const ownerResponse =
    await api.functional.redditCommunity.communityOwner.moderators.index(
      ownerModConnection,
      {
        userId: owner.id,
      },
    );
  typia.assert(ownerResponse);
  // 3. Validate empty response structure
  TestValidator.equals("empty list response", ownerResponse.data.length, 0);
  TestValidator.equals(
    "empty pagination records",
    ownerResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty pagination pages",
    ownerResponse.pagination.pages,
    0,
  );
  // 4. Create another community owner
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorizedOwner = await authorize_community_owner_join(
    unauthorizedConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
      } satisfies IRedditCommunityCommunityOwner.IJoin,
    },
  );
  typia.assert(unauthorizedOwner);
  // 5. Attempt to retrieve the first owner's moderator list with unauthorized connection
  const unauthorizedModConnection: api.IConnection = { host: connection.host };
  unauthorizedModConnection.headers = {
    Authorization: unauthorizedOwner.token.access,
  };
  await TestValidator.httpError("unauthorized user gets 403", 403, async () => {
    await api.functional.redditCommunity.communityOwner.moderators.index(
      unauthorizedModConnection,
      {
        userId: owner.id,
      },
    );
  });
}
