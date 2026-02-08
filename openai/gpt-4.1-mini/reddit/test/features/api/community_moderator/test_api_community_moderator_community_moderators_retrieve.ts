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

export async function test_api_community_moderator_community_moderators_retrieve(
  connection: api.IConnection,
): Promise<void> {
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };

  const validCommunityModeratorId = typia.random<
    string & tags.Format<"uuid">
  >();

  const communityModerator =
    await api.functional.communityPlatform.moderator.communityModerators.at(
      moderatorConnection,
      { communityModeratorId: validCommunityModeratorId },
    );
  typia.assert(communityModerator);

  const nonExistingId =
    ("00000000-0000-0000-0000-000000000000" satisfies string &
      tags.Format<"uuid">);

  await TestValidator.httpError(
    "non-existing communityModeratorId returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.communityModerators.at(
        moderatorConnection,
        { communityModeratorId: nonExistingId },
      );
    },
  );

  const unauthenticatedConnection: api.IConnection = { host: connection.host };

  await TestValidator.httpError(
    "unauthenticated access returns 401 or 403",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.communityModerators.at(
        unauthenticatedConnection,
        { communityModeratorId: validCommunityModeratorId },
      );
    },
  );
}
