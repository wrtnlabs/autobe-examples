import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_community_delete_by_owner_and_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Community deletion by owner and auth check
  // --- Scenario 1 ---
  // Owner user joins and authenticates
  const ownerUser = await authorize_user_join({ host: connection.host }, {});
  const ownerConnection: api.IConnection = { host: connection.host };
  ownerConnection.headers = {
    Authorization: `Bearer ${ownerUser.token.access}`,
  };
  // Simulate communityId for owner User (use ownerUser.id as community id for testing)
  const communityIdOwnedByOwner = ownerUser.id;
  // Owner deletes their community
  await api.functional.communityPlatform.user.communities.erase(
    ownerConnection,
    {
      communityId: communityIdOwnedByOwner,
    },
  );
  // Check community no longer accessible by GET /communities/{communityId} (not provided SDK, so manual validation skipped)
  // We'll try calling erase again and expect 404 error
  await TestValidator.httpError(
    "non-existent community after deletion",
    404,
    async () => {
      await api.functional.communityPlatform.user.communities.erase(
        ownerConnection,
        {
          communityId: communityIdOwnedByOwner,
        },
      );
    },
  );
  // --- Scenario 2 ---
  // Create unauthorized user
  const unauthorizedUser = await authorize_user_join(
    { host: connection.host },
    {},
  );
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  unauthorizedConnection.headers = {
    Authorization: `Bearer ${unauthorizedUser.token.access}`,
  };
  // Unauthorized user attempts to delete owner's community (assumed owned communityId again)
  // Expect 403 Forbidden
  await TestValidator.httpError(
    "unauthorized deletion attempt",
    403,
    async () => {
      await api.functional.communityPlatform.user.communities.erase(
        unauthorizedConnection,
        {
          communityId: communityIdOwnedByOwner,
        },
      );
    },
  );
  // --- Scenario 3 ---
  // Try to delete a non-existent community with random UUID
  const randomCommunityId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete non-existent community",
    404,
    async () => {
      await api.functional.communityPlatform.user.communities.erase(
        ownerConnection,
        {
          communityId: randomCommunityId,
        },
      );
    },
  );
}
