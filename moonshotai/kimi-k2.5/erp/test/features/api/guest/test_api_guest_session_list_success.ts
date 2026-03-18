import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
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
 * Test guest session listing endpoint to verify it returns paginated session
 * summaries with proper filtering and security controls. Validates that
 * authenticated guests can audit their own session history with pagination
 * metadata and required fields. Security is ensured by type system - sensitive
 * tokens are excluded from the ISummary DTO definition.
 */
export async function test_api_guest_session_list_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Initialize guest access to create authentication context
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmGuest.IJoin,
  });
  typia.assert(authorized);
  // 2. Call sessions list endpoint with default pagination (no filters)
  const response = await api.functional.erpHrm.guest.sessions.index(
    guestConnection,
    {
      body: {
        createdAfter: null,
        createdBefore: null,
        status: null,
        ipPattern: null,
        referrerPattern: null,
        cursor: null,
        limit: null,
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(response);
  // 3. Verify pagination has expected values for first page with data
  TestValidator.equals(
    "records count matches at least current session",
    response.pagination.records >= 1,
    true,
  );
  TestValidator.equals(
    "pages count is at least 1",
    response.pagination.pages >= 1,
    true,
  );
  // 4. Verify data array contains at least one session (the current authenticated session)
  TestValidator.predicate(
    "data array has at least one session",
    response.data.length >= 1,
  );
  // 5. Verify at least one active session exists (the current authenticated session)
  const hasActiveSession = response.data.some((s) => s.isActive);
  TestValidator.predicate(
    "has active session matching current authentication",
    hasActiveSession,
  );
}
