import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_community_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const joinResponse = await api.functional.redditClone.auth.owner.join(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        username: RandomGenerator.alphabets(8),
        displayName: RandomGenerator.name(),
      } satisfies IRedditCloneOwner.IJoin,
    },
  );
  typia.assert(joinResponse);
  // Setup: Create community - first create an owner-specific connection with the token
  const community = await api.functional.redditClone.owner.communities.update(
    ownerConnection,
    {
      communityId: "temp-community-id-12345",
      body: {
        name: RandomGenerator.alphabets(6),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_url: null,
      } satisfies IRedditCloneCommunity.IUpdate,
    },
  );
  typia.assert(community);
  // Test: Update community with valid data
  const updatedCommunity =
    await api.functional.redditClone.owner.communities.update(ownerConnection, {
      communityId: community.id,
      body: {
        name: community.name,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        icon_url: null,
      } satisfies IRedditCloneCommunity.IUpdate,
    });
  typia.assert(updatedCommunity);
  // Validate: Check updated fields
  TestValidator.equals(
    "description updated",
    updatedCommunity.description,
    community.description,
  );
  TestValidator.equals("name unchanged", updatedCommunity.name, community.name);
  // Test: Update community name with new valid name
  const newCommunityName = RandomGenerator.alphabets(8);
  const renamedCommunity =
    await api.functional.redditClone.owner.communities.update(ownerConnection, {
      communityId: community.id,
      body: {
        name: newCommunityName,
        description: updatedCommunity.description,
        icon_url: community.iconUrl,
      } satisfies IRedditCloneCommunity.IUpdate,
    });
  typia.assert(renamedCommunity);
  TestValidator.equals("name changed", renamedCommunity.name, newCommunityName);
  // Test: Validate icon URL format
  const validIconUrl = "https://example.com/icon.png";
  const communityWithIcon =
    await api.functional.redditClone.owner.communities.update(ownerConnection, {
      communityId: community.id,
      body: {
        name: renamedCommunity.name,
        description: updatedCommunity.description,
        icon_url: validIconUrl,
      } satisfies IRedditCloneCommunity.IUpdate,
    });
  typia.assert(communityWithIcon);
  TestValidator.equals("icon URL set", communityWithIcon.iconUrl, validIconUrl);
  // Test: Set null icon URL
  const communityWithoutIcon =
    await api.functional.redditClone.owner.communities.update(ownerConnection, {
      communityId: community.id,
      body: {
        name: renamedCommunity.name,
        description: updatedCommunity.description,
        icon_url: null,
      } satisfies IRedditCloneCommunity.IUpdate,
    });
  typia.assert(communityWithoutIcon);
  TestValidator.equals("icon URL cleared", communityWithoutIcon.iconUrl, null);
}
