import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModerator";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_moderation_actions_filter_by_type(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IRedditLikeAdmin.IJoin>(),
  });
  // Step 2: Test ban action filtering
  const banResult =
    await api.functional.redditLike.admin.moderation.actions.index(
      adminConnection,
      {
        body: {
          action_type: "ban",
        } satisfies IRedditLikeModerator.IRequest,
      },
    );
  typia.assert(banResult);
  // Step 3: Verify ban actions only
  for (const item of banResult.data) {
    TestValidator.equals("ban action type", item.actionType, "ban");
  }
  // Step 4: Test report action filtering
  const reportResult =
    await api.functional.redditLike.admin.moderation.actions.index(
      adminConnection,
      {
        body: {
          action_type: "report",
        } satisfies IRedditLikeModerator.IRequest,
      },
    );
  typia.assert(reportResult);
  // Step 5: Verify report actions only
  for (const item of reportResult.data) {
    TestValidator.equals("report action type", item.actionType, "report");
  }
}
