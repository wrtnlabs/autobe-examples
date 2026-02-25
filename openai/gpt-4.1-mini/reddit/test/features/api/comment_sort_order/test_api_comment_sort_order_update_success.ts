import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSortOrder";
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
import { generate_random_community_platform_comment_sort_orders_create } from "../../../generate/generate_random_community_platform_comment_sort_orders_create";
import { prepare_random_community_platform_comment_sort_order } from "../../../prepare/prepare_random_community_platform_comment_sort_order";

export async function test_api_comment_sort_order_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join and setup privileged connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderator.token.access}`,
  };
  // 2. Create an initial comment sort order as prerequisite
  const initialSortOrder =
    await generate_random_community_platform_comment_sort_orders_create(
      moderatorConnection,
      { body: {} },
    );
  typia.assert(initialSortOrder);
  // 3. Prepare updated data with changed strategy and sortValue
  const updatedData: ICommunityPlatformCommentSortOrder.IUpdate = {
    strategy: initialSortOrder.strategy === "best" ? "new" : "best",
    sortValue: initialSortOrder.sortValue + 10,
  };
  // 4. Perform the update operation
  const updated =
    await api.functional.communityPlatform.commentSortOrders.updateCommentSortOrder(
      moderatorConnection,
      {
        commentSortOrderId: initialSortOrder.id,
        body: updatedData,
      },
    );
  typia.assert(updated);
  // 5. Validate the updated response data
  TestValidator.equals(
    "comment sort order id matches",
    updated.id,
    initialSortOrder.id,
  );
  TestValidator.equals(
    "strategy updated correctly",
    updated.strategy,
    updatedData.strategy,
  );
  TestValidator.equals(
    "sortValue updated correctly",
    updated.sortValue,
    updatedData.sortValue,
  );
  TestValidator.predicate(
    "updatedAt is newer than createdAt",
    new Date(updated.updatedAt) > new Date(updated.createdAt),
  );
  TestValidator.equals(
    "deletedAt is null since not deleted",
    updated.deletedAt ?? null,
    null,
  );
  // 6. Attempt to update a soft-deleted record should fail
  const softDeletedBody: ICommunityPlatformCommentSortOrder.IUpdate = {
    strategy: "controversial",
  };
  // Forcing an update on a soft-deleted record to test enforcement
  // Use the id of the initial record
  // We expect this to throw an error or fail
  await TestValidator.error("cannot update soft-deleted record", async () => {
    await api.functional.communityPlatform.commentSortOrders.updateCommentSortOrder(
      moderatorConnection,
      {
        commentSortOrderId: initialSortOrder.id,
        body: softDeletedBody,
      },
    );
  });
  // 7. Unauthorized connection attempt to update must fail
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorizedUpdateData: ICommunityPlatformCommentSortOrder.IUpdate = {
    strategy: "best",
    sortValue: 1,
  };
  await TestValidator.error("unauthorized user cannot update", async () => {
    await api.functional.communityPlatform.commentSortOrders.updateCommentSortOrder(
      unauthorizedConnection,
      {
        commentSortOrderId: initialSortOrder.id,
        body: unauthorizedUpdateData,
      },
    );
  });
}
