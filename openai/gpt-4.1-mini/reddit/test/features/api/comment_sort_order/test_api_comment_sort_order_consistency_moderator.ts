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

export async function test_api_comment_sort_order_consistency_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario for concurrency and caching effect:
  // - First, authenticate as moderator.
  // - Retrieve sorting metadata for the same comment sort order multiple times to verify consistent results and potential caching behavior.
  // - Validate sorting strategy and score remains stable across multiple calls.
  // - Ensure no race conditions or inconsistent data appear.
  // - Use valid UUIDs for parameters.
  // Create a dedicated moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Authenticate as a new moderator join (empty IJoin object as per definition)
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(authorized);
  // Use the token to set Authorization header for moderator connection
  moderatorConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Prepare valid UUIDs for commentId and sortOrderId
  // Since no sample IDs are provided, generate them using typia.random with uuid format
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const sortOrderId = typia.random<string & tags.Format<"uuid">>();
  // Fetch the comment sort order metadata multiple times to test consistency
  const firstResponse =
    await api.functional.communityPlatform.moderator.comments.sort_orders.atSortOrder(
      moderatorConnection,
      { commentId, sortOrderId },
    );
  typia.assert(firstResponse);
  // Retrieve the data multiple times (e.g., 3 times) to verify consistent results
  const repeatedResponses = [firstResponse];
  for (let i = 0; i < 2; i++) {
    const response =
      await api.functional.communityPlatform.moderator.comments.sort_orders.atSortOrder(
        moderatorConnection,
        { commentId, sortOrderId },
      );
    typia.assert(response);
    repeatedResponses.push(response);
  }
  // Verify that all retrieved responses are deep equal (stable and consistent results)
  for (let i = 1; i < repeatedResponses.length; i++) {
    TestValidator.equals(
      `sort order response consistency check #${i}`,
      repeatedResponses[0],
      repeatedResponses[i],
    );
  }
}
