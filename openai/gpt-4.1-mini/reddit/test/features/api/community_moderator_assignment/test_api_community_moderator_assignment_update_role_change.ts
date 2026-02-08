import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_community_moderator_assignment_update_role_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join and authorize connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {} satisfies ICommunityPlatformModerator.IJoin,
    });
  moderatorConnection.headers = {
    ...(moderatorConnection.headers ?? {}),
    Authorization: authorized.token.access,
  };
  // 2. Simulate two distinct community moderator assignments
  //    Using random UUIDs as assignment IDs for update
  const communityModeratorId1 = typia.random<string & tags.Format<"uuid">>();
  const communityModeratorId2 = typia.random<string & tags.Format<"uuid">>();
  // 3. Update first assignment to 'owner'
  const updateBodyOwner: ICommunityPlatformCommunityModerator.IUpdate = {
    role: "owner",
  };
  const updatedOwnerRaw =
    await api.functional.communityPlatform.moderator.communityModerators.update(
      moderatorConnection,
      {
        communityModeratorId: communityModeratorId1,
        body: updateBodyOwner,
      },
    );
  typia.assert(updatedOwnerRaw);
  // 4. Update second assignment to 'moderator'
  const updateBodyModerator: ICommunityPlatformCommunityModerator.IUpdate = {
    role: "moderator",
  };
  const updatedModeratorRaw =
    await api.functional.communityPlatform.moderator.communityModerators.update(
      moderatorConnection,
      {
        communityModeratorId: communityModeratorId2,
        body: updateBodyModerator,
      },
    );
  typia.assert(updatedModeratorRaw);
  // 5. Edge case: Attempt update violating unique owner constraint
  await TestValidator.error("duplicate owner role violation", async () => {
    await api.functional.communityPlatform.moderator.communityModerators.update(
      moderatorConnection,
      {
        communityModeratorId: communityModeratorId2,
        body: updateBodyOwner,
      },
    );
  });
  // 6. Edge case: Unauthorized user tries to update
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized update rejected", async () => {
    await api.functional.communityPlatform.moderator.communityModerators.update(
      unauthorizedConnection,
      {
        communityModeratorId: communityModeratorId1,
        body: updateBodyModerator,
      },
    );
  });
}
