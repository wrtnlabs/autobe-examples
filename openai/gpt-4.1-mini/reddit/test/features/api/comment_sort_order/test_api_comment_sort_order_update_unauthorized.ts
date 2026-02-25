import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSortOrder";
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

export async function test_api_comment_sort_order_update_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Test that an unauthorized user cannot update a comment sort order
  // 1. Join a normal user (authorization as user)
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(user);
  // Update comment sort order with unauthorized user - Expect error 403 Forbidden
  const commentSortOrderId = typia.random<string & tags.Format<"uuid">>();
  const updateBody: ICommunityPlatformCommentSortOrder.IUpdate = {
    strategy: "best",
    sortValue: 1.23,
  };
  await TestValidator.httpError(
    "unauthorized user cannot update comment sort order",
    403,
    async () => {
      await api.functional.communityPlatform.commentSortOrders.updateCommentSortOrder(
        userConnection,
        {
          commentSortOrderId: commentSortOrderId,
          body: updateBody,
        },
      );
    },
  );
}
