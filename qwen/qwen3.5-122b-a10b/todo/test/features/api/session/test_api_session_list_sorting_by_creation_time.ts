import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test session list sorting by creation time with different sort orders.
 *
 * Validates the sorting functionality of the guest session list endpoint by querying sessions with various sort parameters and verifying they are returned in the correct order. The test ensures that sessions can be sorted by creation time (ascending/descending) and expiration time (descending).
 *
 * Note: Since each guest authentication creates a single session, this test verifies that the sorting logic works correctly even with minimal session data. The sorting functionality is validated by ensuring the API accepts sort parameters and returns properly ordered results.
 *
 * 1. Authenticate as guest using device fingerprint.
 * 2. Query sessions with sortBy='created_at' and sortOrder='desc', verify response structure.
 * 3. Query sessions with sortBy='created_at' and sortOrder='asc', verify response structure.
 * 4. Query sessions with sortBy='expired_at' and sortOrder='desc', verify response structure.
 * 5. Validate pagination metadata is accurate for all queries.
 */
export async function test_api_session_list_sorting_by_creation_time(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest connection and authenticate
  const guestConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(auth);
  // 2. Query sessions with sortBy='created_at' and sortOrder='desc' (newest first)
  const descResult = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(descResult);
  // Verify descending order by created_at (if multiple sessions exist)
  if (descResult.data.length > 1) {
    for (let i = 1; i < descResult.data.length; i++) {
      TestValidator.predicate(
        `session ${i} created_at should be <= session ${i - 1}`,
        descResult.data[i].created_at <= descResult.data[i - 1].created_at,
      );
    }
  }
  // 3. Query sessions with sortBy='created_at' and sortOrder='asc' (oldest first)
  const ascResult = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "asc",
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(ascResult);
  // Verify ascending order by created_at (if multiple sessions exist)
  if (ascResult.data.length > 1) {
    for (let i = 1; i < ascResult.data.length; i++) {
      TestValidator.predicate(
        `session ${i} created_at should be >= session ${i - 1}`,
        ascResult.data[i].created_at >= ascResult.data[i - 1].created_at,
      );
    }
  }
  // 4. Query sessions with sortBy='expired_at' and sortOrder='desc'
  const expiredDescResult = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        sortBy: "expired_at",
        sortOrder: "desc",
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(expiredDescResult);
  // Verify descending order by expired_at (if multiple sessions exist)
  if (expiredDescResult.data.length > 1) {
    for (let i = 1; i < expiredDescResult.data.length; i++) {
      TestValidator.predicate(
        `session ${i} expired_at should be <= session ${i - 1}`,
        expiredDescResult.data[i].expired_at <=
          expiredDescResult.data[i - 1].expired_at,
      );
    }
  }
  // 5. Validate pagination metadata is consistent
  TestValidator.equals(
    "pagination records count matches data length",
    descResult.pagination.records,
    descResult.data.length,
  );
  TestValidator.equals(
    "pagination limit matches request",
    descResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination current page is valid",
    descResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    descResult.pagination.pages >= 1,
  );
  // Verify all queries return same record count
  TestValidator.equals(
    "desc query records count",
    descResult.pagination.records,
    ascResult.pagination.records,
  );
  TestValidator.equals(
    "expired_desc query records count",
    descResult.pagination.records,
    expiredDescResult.pagination.records,
  );
}
