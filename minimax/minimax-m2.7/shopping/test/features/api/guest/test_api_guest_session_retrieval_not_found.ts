import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test retrieving a guest session that does not exist or has expired.
 *
 * Validates that the API properly returns an HTTP 404 error when attempting to
 * retrieve a guest session using a non-existent or invalid session ID. This
 * ensures proper error handling for invalid session lookups.
 *
 * **Error Handling Verification:**
 *
 * The test uses a zero UUID (00000000-0000-0000-0000-000000000000) that is
 * guaranteed not to exist in the system. The API should return HTTP 404
 * indicating the session was not found or has expired.
 *
 * 1. Create a non-existent session ID using zero UUID format
 * 2. Call GET /ecommerceMall/guest/guest/sessions/{sessionId}
 * 3. Validate that an HttpError is thrown with 404 status
 */
export async function test_api_guest_session_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Non-existent session ID - guaranteed to not exist in the database
  const nonExistentSessionId =
    "00000000-0000-0000-0000-000000000000" as string & tags.Format<"uuid">;
  // Attempt to retrieve a non-existent session
  await TestValidator.httpError(
    "non-existent session returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.guest.guest.sessions.at(connection, {
        sessionId: nonExistentSessionId,
      }),
  );
}
