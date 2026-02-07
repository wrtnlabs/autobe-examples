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

export async function test_api_discussion_board_guest_tags_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create guest session for authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const guestSession = await authorize_guest_join(guestConnection, {
    body: {},
  });
  // Execute: Retrieve tags list using authenticated guest connection
  const response =
    await api.functional.discussionBoard.guest.tags.index(guestConnection);
  // Validate: Check response structure and empty data handling
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals("page info", response.pagination.current, 1);
  TestValidator.equals("page info", response.pagination.limit, 10);
  TestValidator.equals("page info", response.pagination.records, 0);
  TestValidator.equals("page info", response.pagination.pages, 0);
  // Validate empty data array
  TestValidator.equals("data array", response.data.length, 0);
}
