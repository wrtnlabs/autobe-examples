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

export async function test_api_discussion_board_guest_tags_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection for unauthorized access
  const guestConnection: api.IConnection = { host: connection.host };
  // Join as guest to establish session
  await authorize_guest_join(guestConnection, {
    body: {},
  });
  // Test pagination endpoint - no request body needed for GET
  const result =
    await api.functional.discussionBoard.guest.tags.index(guestConnection);
  // Validate response structure
  typia.assert(result);
  // Validate pagination structure
  typia.assert(result.pagination);
  // Verify pagination fields exist and have correct types
  TestValidator.predicate(
    "current page is positive",
    result.pagination.current > 0,
  );
  TestValidator.predicate("limit is positive", result.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    result.pagination.pages >= 0,
  );
  // Validate data array exists
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  // Verify tag summary structure if data exists
  if (result.data.length > 0) {
    typia.assert(result.data[0]);
  }
}
