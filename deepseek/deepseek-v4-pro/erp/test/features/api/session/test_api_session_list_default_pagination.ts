import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Verify that the sessions index endpoint returns a properly paginated list with default parameters.
 *
 * Tests the sessions listing endpoint with an empty request body to exercise default pagination
 * settings (page 1, limit 20). Validates the complete response structure including pagination
 * metadata, session entry fields, and critically confirms that no access_token or refresh_token
 * values are exposed in any session entry.
 *
 * 1. Register and authenticate as a guest to establish required authorization context.
 * 2. Call the sessions index endpoint with an empty request body to trigger default pagination.
 * 3. Validate pagination metadata: current page, limit, total records, and total pages calculation.
 * 4. Inspect each session entry for required fields and verify no sensitive token exposure.
 * 5. Confirm sessions are ordered by created_at in descending order (newest first).
 */
export async function test_api_session_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {});
  // 2. Call sessions index with empty body (default pagination)
  const page = await api.functional.erpHrm.guest.sessions.index(
    guestConnection,
    {
      body: {} satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(page);
  // 3. Validate pagination metadata
  TestValidator.equals("pagination current page", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records >= 0",
    page.pagination.records >= 0,
  );
  TestValidator.predicate("pagination pages >= 0", page.pagination.pages >= 0);
  TestValidator.equals(
    "pagination pages calculation",
    page.pagination.pages,
    Math.ceil(page.pagination.records / page.pagination.limit),
  );
  // 4. Validate each session entry
  for (const session of page.data) {
    // Verify no sensitive tokens exposed
    TestValidator.predicate(
      "no access_token exposed",
      !Object.keys(session).includes("access_token"),
    );
    TestValidator.predicate(
      "no refresh_token exposed",
      !Object.keys(session).includes("refresh_token"),
    );
  }
  // 5. Validate descending order by created_at
  if (page.data.length > 1) {
    for (let i = 0; i < page.data.length - 1; i++) {
      TestValidator.predicate(
        "sessions ordered by created_at descending",
        new Date(page.data[i].created_at).getTime() >=
          new Date(page.data[i + 1].created_at).getTime(),
      );
    }
  }
}
