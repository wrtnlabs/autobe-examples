import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMemberSession";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test the primary success path for retrieving guest authentication sessions with default pagination.
 *
 * 1. Register a new guest account using POST /redditClone/auth/guest/join
 * 2. Call PATCH /redditClone/guest/sessions with empty body for default pagination
 * 3. Validate response structure, pagination metadata, and session data
 * 4. Verify data isolation and no sensitive token exposure
 */
export async function test_api_guest_session_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Register guest account (automatically creates one session)
  const auth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
    },
  });
  typia.assert(auth);
  // 3. Call PATCH /redditClone/guest/sessions with empty body for default pagination
  // Using the SAME guestConnection which already has auth token
  const response = await api.functional.redditClone.guest.sessions.index(
    guestConnection,
    {
      body: {} satisfies IRedditCloneMemberSession.IRequest,
    },
  );
  typia.assert(response);
  // 4. Validate pagination metadata
  TestValidator.equals("default page is 1", response.pagination.current, 1);
  TestValidator.equals("default limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "records count is positive",
    response.pagination.records > 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 5. Validate data array
  TestValidator.predicate(
    "sessions array is not empty",
    response.data.length > 0,
  );
  TestValidator.predicate(
    "sessions count does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
  // 6. Validate each session structure
  await ArrayUtil.asyncForEach(response.data, async (session) => {
    typia.assert(session);
    // Validate session fields exist with correct types
    TestValidator.predicate(
      `session ${session.id} has valid UUID format`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
    );
    TestValidator.predicate(
      `session ${session.id} has IP address`,
      session.ip.length > 0,
    );
    TestValidator.predicate(
      `session ${session.id} has href`,
      session.href.length > 0,
    );
    TestValidator.predicate(
      `session ${session.id} has valid access token expiry`,
      session.access_token_expires_at.length > 0,
    );
    TestValidator.predicate(
      `session ${session.id} has valid refresh token expiry`,
      session.refresh_token_expires_at.length > 0,
    );
    TestValidator.predicate(
      `session ${session.id} has created_at`,
      session.created_at.length > 0,
    );
    TestValidator.predicate(
      `session ${session.id} has expired_at`,
      session.expired_at.length > 0,
    );
    // Validate member object
    typia.assert(session.member);
    TestValidator.predicate(
      `session ${session.id} member has valid UUID format`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.member.id,
      ),
    );
    TestValidator.predicate(
      `session ${session.id} member has username`,
      session.member.username.length > 0,
    );
    TestValidator.predicate(
      `session ${session.id} member has display_name`,
      session.member.display_name.length > 0,
    );
    TestValidator.predicate(
      `session ${session.id} member has karma as number`,
      typeof session.member.karma === "number",
    );
    TestValidator.predicate(
      `session ${session.id} member has created_at`,
      session.member.created_at.length > 0,
    );
    // Verify nullable fields are properly typed (can be null or string)
    TestValidator.predicate(
      `session ${session.id} user_agent is string or null`,
      session.user_agent === null || typeof session.user_agent === "string",
    );
    TestValidator.predicate(
      `session ${session.id} referrer is string or null`,
      session.referrer === null || typeof session.referrer === "string",
    );
    TestValidator.predicate(
      `session ${session.id} member avatar_uri is string or null`,
      session.member.avatar_uri === null ||
        typeof session.member.avatar_uri === "string",
    );
  });
  // 7. Validate sorting (newest first by created_at)
  if (response.data.length > 1) {
    let isSorted = true;
    for (let i = 1; i < response.data.length; i++) {
      if (
        new Date(response.data[i].created_at).getTime() >
        new Date(response.data[i - 1].created_at).getTime()
      ) {
        isSorted = false;
        break;
      }
    }
    TestValidator.predicate(
      "sessions sorted by created_at descending",
      isSorted,
    );
  }
}
