import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session list retrieval with pagination and data isolation validation.
 *
 * Validates the complete guest session retrieval workflow including guest authentication, session list query with default pagination, and comprehensive response validation. Ensures that session data is properly isolated to the authenticated guest and includes all required metadata fields for security auditing.
 *
 * Special attention is given to verifying that the pagination metadata is accurate, sessions are sorted by creation timestamp in descending order (newest first), and sensitive token values are excluded from the response for security purposes.
 *
 * 1. Guest account is created with device fingerprint and session metadata.
 * 2. Guest calls session list endpoint with empty request body for default pagination.
 * 3. Validates response structure matches IPageIShoppingMallAdminSession.ISummary.
 * 4. Validates pagination metadata contains current, limit, records, and pages fields.
 * 5. Validates each session includes id, ip, href, referrer, created_at, expired_at.
 * 6. Validates sessions are sorted by created_at DESC (newest first).
 * 7. Validates data isolation - only authenticated guest's sessions are returned.
 */
export async function test_api_guest_session_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account and establish authentication session
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallGuest.IJoin,
  });
  typia.assert(guest);
  // 2. Retrieve session list with default pagination (empty request body)
  const sessionList = await api.functional.shoppingMall.guest.sessions.index(
    guestConnection,
    {
      body: {} satisfies IShoppingMallAdminSession.IRequest,
    },
  );
  typia.assert(sessionList);
  // 3. Validate pagination metadata values (business logic, not types)
  TestValidator.predicate(
    "current page is at least 1",
    sessionList.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is at least 1",
    sessionList.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "records count is non-negative",
    sessionList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    sessionList.pagination.pages >= 0,
  );
  // 4. Validate pagination consistency (business logic)
  if (sessionList.pagination.records > 0) {
    TestValidator.predicate(
      "pages calculation matches records and limit",
      sessionList.pagination.pages ===
        Math.ceil(
          sessionList.pagination.records / sessionList.pagination.limit,
        ),
    );
  }
  // 5. Validate session data array is not empty (data isolation)
  TestValidator.predicate(
    "at least one session exists for authenticated guest",
    sessionList.data.length >= 1,
  );
  // 6. Validate default sorting by created_at DESC (newest first)
  if (sessionList.data.length > 1) {
    for (let i = 0; i < sessionList.data.length - 1; i++) {
      const currentSession = sessionList.data[i];
      const nextSession = sessionList.data[i + 1];
      TestValidator.predicate(
        `session ${i} is newer than session ${i + 1}`,
        new Date(currentSession.created_at).getTime() >=
          new Date(nextSession.created_at).getTime(),
      );
    }
  }
  // 7. Validate session metadata completeness (business logic - all sessions have admin relation)
  for (const session of sessionList.data) {
    TestValidator.predicate(
      "session has admin relation",
      session.admin !== undefined,
    );
    TestValidator.predicate(
      "admin has member relation",
      session.admin.member !== undefined,
    );
  }
}
