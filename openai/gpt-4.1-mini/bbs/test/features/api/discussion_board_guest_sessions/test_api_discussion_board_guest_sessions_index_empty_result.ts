import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardRegisteredUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test querying user sessions when no sessions exist that match criteria.
 *
 * Ensures empty paginated result is returned gracefully without errors.
 * Valid admin authorization must be simulated.
 *
 * This test verifies that the system correctly handles empty dataset
 * cases and pagination metadata for zero records.
 */
export async function test_api_discussion_board_guest_sessions_index_empty_result(
  connection: IConnection,
): Promise<void> {
  // 1. Guest join to create authorized admin guest context
  const guestConnection: IConnection = { host: connection.host };
  // minimal join request body
  const joinBody: IDiscussionBoardGuest.IJoin = {
    deviceFingerprint: typia.random<string>(),
    userAgent: "Mozilla/5.0 (compatible; AutoBE Test)",
    ipAddress: "127.0.0.1",
    anonymousId: typia.random<string>(),
  };
  const authorizedGuest = await authorize_guest_join(guestConnection, {
    body: joinBody,
  });
  typia.assert(authorizedGuest);
  // Update guestConnection with Authorization header
  guestConnection.headers ??= {};
  guestConnection.headers.Authorization = authorizedGuest.token.access;
  // 2. Make request to fetch sessions with impossible filter to get zero results
  // For example, filter by an IP address that very unlikely exists
  const requestBody: IDiscussionBoardRegisteredUserSession.IRequest = {
    ip: "255.255.255.255", // unlikely IP to filter
    page: 1,
    limit: 10,
  };
  const output = await api.functional.discussionBoard.guest.sessions.index(
    guestConnection,
    { body: requestBody },
  );
  typia.assert(output);
  // 3. Validate output is empty page result
  TestValidator.equals(
    "records count should be 0",
    output.pagination.records,
    0,
  );
  TestValidator.equals("data array length should be 0", output.data.length, 0);
  TestValidator.equals("pages count should be 0", output.pagination.pages, 0);
  TestValidator.equals(
    "current page should be 1",
    output.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 10", output.pagination.limit, 10);
}
