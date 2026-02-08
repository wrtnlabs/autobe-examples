import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSortOrder";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_comments_create } from "../../../generate/generate_random_community_platform_user_comments_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";

export async function test_api_community_platform_moderator_update_comment_sort_orders_comment_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator registration and login
  const moderatorConnection: api.IConnection = { host: connection.host };
  const modJoin = await authorize_moderator_join(moderatorConnection, {
    body: typia.random<ICommunityPlatformModerator.IJoin>(),
  });
  typia.assert(modJoin);
  const modLogin = await authorize_moderator_login(moderatorConnection, {
    body: typia.random<ICommunityPlatformModerator.ILogin>(),
  });
  typia.assert(modLogin);
  // 2. User registration and login
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_user_join(userConnection, {
    body: typia.random<ICommunityPlatformUser.IJoin>(),
  });
  typia.assert(userJoin);
  const userLogin = await authorize_user_login(userConnection, {
    body: typia.random<ICommunityPlatformUser.ILogin>(),
  });
  typia.assert(userLogin);
  // 3. User creates a comment to be sorted
  const comment = await generate_random_community_platform_user_comments_create(
    userConnection,
    {},
  );
  typia.assert(comment);
  // 4. Moderator attempts to update sort orders with non-existent commentId
  const invalidCommentId = typia.random<string & tags.Format<"uuid">>();
  const body = typia.random<ICommunityPlatformCommentSortOrder.IRequest>();
  await TestValidator.error(
    "update comment sort orders with non-existent commentId",
    async () => {
      await api.functional.communityPlatform.moderator.comments.sort_orders.index(
        moderatorConnection,
        {
          commentId: invalidCommentId,
          body,
        },
      );
    },
  );
}
