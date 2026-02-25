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

export async function test_api_community_update_name_uniqueness_conflict(
  connection: api.IConnection,
): Promise<void> {
  // This test checks that updating a community's name to a duplicate of an existing community's name fails with a 409 conflict.
  // 1. Authenticate as a user using authorize_user_join utility
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  userConnection.headers = {
    ...userConnection.headers,
    Authorization: user.token.access,
  };
  // 2. Create the first community with a unique name
  const firstCommunity =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(firstCommunity);
  // 3. Create the second community with another unique name
  const secondCommunity =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(secondCommunity);
  // 4. Attempt to update the second community's name to the first community's name
  const updateBody: ICommunityPlatformCommunity.IUpdate = {
    name: firstCommunity.name, // duplicate name to trigger uniqueness conflict
  };
  // 5. Expect an HTTP 409 conflict error on the update
  await TestValidator.httpError(
    "conflict error on duplicate community name update",
    409,
    async () => {
      await api.functional.communityPlatform.user.communities.updateCommunity(
        userConnection,
        {
          communityId: secondCommunity.id,
          body: updateBody,
        },
      );
    },
  );
  // 6. Fetch the second community again to ensure no change was made
  // Since GET /communityPlatform/user/communities/{communityId} endpoint or utility not provided,
  // we can't fetch. We'll rely on the assumption that no change was applied after failure.
  // 7. Authorization enforcement verification is implicitly tested because the update was made
  // with proper userConnection that owns the communities. Unauthorized update should fail,
  // but that is out of scope here since no auth test is specified.
}
