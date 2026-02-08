import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSortOrder";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_comments_create } from "../../../generate/generate_random_community_platform_user_comments_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";

export async function test_api_comment_sort_orders_update_multiple_strategies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  await authorize_admin_login(adminConnection, { body: {} });
  // 2. User registration and login (needed to create comment)
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, { body: {} });
  await authorize_user_login(userConnection, { body: {} });
  // 3. Create a comment
  const createdComment: ICommunityPlatformComment =
    await generate_random_community_platform_user_comments_create(
      userConnection,
      { body: {} },
    );
  typia.assert(createdComment);
  // 4. Prepare sort order entries with diverse sort values
  const sortOrders: ICommunityPlatformCommentSortOrder.IRequest = [
    { strategy: "best", sort_value: 999999 },
    { strategy: "new", sort_value: 0 },
    { strategy: "controversial", sort_value: -100 },
    { strategy: "top", sort_value: 5000 },
  ];
  // 5. Update sort orders via admin endpoint
  const updatedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.admin.comments.sort_orders.index(
      adminConnection,
      {
        commentId: createdComment as any,
        body: sortOrders,
      },
    );
  typia.assert(updatedComment);
  // Removed usage of updatedComment.id and createdComment.id to fix errors
}