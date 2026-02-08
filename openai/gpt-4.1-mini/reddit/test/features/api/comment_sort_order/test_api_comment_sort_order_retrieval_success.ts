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

export async function test_api_comment_sort_order_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario description:
  // This test scenario covers the successful retrieval of sorting metadata for an existing comment's sorting order.
  // It verifies that the API correctly returns the sorting strategy and score used to order comments, such as 'best', 'new', or 'controversial'.
  // It validates that the commentId and sortOrderId path parameters filter the correct sorting record from the database.
  // The test also ensures that authorization as a user is necessary before accessing the endpoint.
  // The expected outcome is a 200 response with detailed sorting order information matching the requested IDs.
  // 1. User joins and obtains authorized connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Generate UUIDs for commentId and sortOrderId to simulate existing entities
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const sortOrderId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve sort order metadata for the given commentId and sortOrderId
  const sortOrder: ICommunityPlatformCommentSortOrder =
    await api.functional.communityPlatform.user.comments.sort_orders.atSortOrder(
      userConnection,
      { commentId, sortOrderId },
    );
  typia.assert(sortOrder);
}
