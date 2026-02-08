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

export async function test_api_comment_sort_order_retrieve_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator account creation and login
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };
  // Generate valid UUIDs for existing comment and sort order
  const validCommentId = typia.random<string & tags.Format<"uuid">>();
  const validSortOrderId = typia.random<string & tags.Format<"uuid">>();
  // Scenario 1: Retrieve existing sorting order detail
  const validSortOrder =
    await api.functional.communityPlatform.moderator.comments.sort_orders.atSortOrder(
      moderatorConnection,
      { commentId: validCommentId, sortOrderId: validSortOrderId },
    );
  typia.assert(validSortOrder);
  // Scenario 2: Retrieve non-existent sortOrderId - expect 404 error
  const nonExistentSortOrderId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError("sort order not found 404", 404, async () => {
    await api.functional.communityPlatform.moderator.comments.sort_orders.atSortOrder(
      moderatorConnection,
      { commentId: validCommentId, sortOrderId: nonExistentSortOrderId },
    );
  });
  // Scenario 3: Invalid UUID formats for commentId and sortOrderId - expect 400 error
  const invalidCommentId = "invalid-uuid-format";
  const invalidSortOrderId = "also-invalid-uuid";
  await TestValidator.httpError("invalid UUID format 400", 400, async () => {
    await api.functional.communityPlatform.moderator.comments.sort_orders.atSortOrder(
      moderatorConnection,
      {
        commentId: invalidCommentId as string & tags.Format<"uuid">,
        sortOrderId: validSortOrderId,
      },
    );
  });
  await TestValidator.httpError("invalid UUID format 400", 400, async () => {
    await api.functional.communityPlatform.moderator.comments.sort_orders.atSortOrder(
      moderatorConnection,
      {
        commentId: validCommentId,
        sortOrderId: invalidSortOrderId as string & tags.Format<"uuid">,
      },
    );
  });
  await TestValidator.httpError("invalid UUID format 400", 400, async () => {
    await api.functional.communityPlatform.moderator.comments.sort_orders.atSortOrder(
      moderatorConnection,
      {
        commentId: invalidCommentId as string & tags.Format<"uuid">,
        sortOrderId: invalidSortOrderId as string & tags.Format<"uuid">,
      },
    );
  });
}
