import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModeratorRole";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_bulk_assignment_remove_last_owner_fails(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community with single owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_moderator_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(2),
      display_name: RandomGenerator.name(),
    },
  });
  // Create community
  const communities =
    await api.functional.redditLike.moderator.communities.moderator_roles.updateModeratorRoles(
      ownerConnection,
      {
        communityId: RandomGenerator.alphaNumeric(8),
        body: {
          user_id: owner.id,
          role: "owner",
        },
      },
    );
  typia.assert(communities);
  // 2. Try to remove the last owner (should fail)
  await TestValidator.error("cannot remove last owner", async () => {
    await api.functional.redditLike.moderator.communities.moderator_roles.updateModeratorRoles(
      ownerConnection,
      {
        communityId: communities.data[0].id,
        body: {
          user_id: owner.id,
          role: "owner",
          page: 1,
          limit: 100,
        },
      },
    );
  });
}
