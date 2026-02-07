import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_discussion_board_guest_tags_listing(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection with authentication token
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: typia.random<IDiscussionBoardGuest.IJoin>(),
  });
  // Call tags listing endpoint
  const result =
    await api.functional.discussionBoard.guest.tags.index(guestConnection);
  // Validate response structure
  typia.assert(result);
  // Validate pagination
  TestValidator.equals("pagination exists", result.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    result.pagination.records >= 0,
  );
  // Validate tags array
  TestValidator.predicate("has tags data", Array.isArray(result.data));
  TestValidator.equals(
    "tags count matches pagination records",
    result.data.length,
    result.pagination.records,
  );
  // Validate each tag has required structure
  if (result.data.length > 0) {
    TestValidator.predicate(
      "first tag exists",
      result.data[0] !== null && result.data[0] !== undefined,
    );
  }
}
