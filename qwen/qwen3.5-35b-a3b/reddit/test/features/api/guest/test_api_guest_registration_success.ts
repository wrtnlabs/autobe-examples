import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare registration data with valid email, username, and other required fields
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(1),
    bio: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditPlatformGuest.IJoin;
  // 2. Create guest account using utility function
  const result = await authorize_guest_join(connection, {
    body: joinInput,
  });
  // 3. Validate response structure and types using typia.assert
  typia.assert(result);
  // 4. Verify account identity fields
  TestValidator.equals("email matches input", result.email, joinInput.email);
  TestValidator.equals(
    "username matches input",
    result.username,
    joinInput.username,
  );
  TestValidator.equals(
    "display_name matches input",
    result.display_name,
    joinInput.display_name,
  );
  TestValidator.equals("bio is null", result.bio, null);
  TestValidator.equals("avatar_url is null", result.avatar_url, null);
  TestValidator.equals("initial karma is 0", result.karma, 0);
  // 5. Verify timestamp fields are valid date-time format
  TestValidator.predicate(
    "created_at is valid date-time",
    new Date(result.created_at) instanceof Date,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    new Date(result.updated_at) instanceof Date,
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    result.deleted_at,
    null,
  );
  // 6. Verify sessions array is present and contains session data
  TestValidator.predicate(
    "sessions array is not empty",
    result.sessions.length > 0,
  );
  // 7. Verify session data includes correct IP address
  if (result.sessions.length > 0) {
    const session = result.sessions[0];
    if (joinInput.ip) {
      TestValidator.equals(
        "session IP matches request IP",
        session.ip,
        joinInput.ip,
      );
    }
    TestValidator.equals("session ID is UUID", session.id, session.id);
    TestValidator.equals(
      "session reddit_platform_guest_id matches result id",
      session.reddit_platform_guest_id,
      result.id,
    );
    TestValidator.equals(
      "session href matches input",
      session.href,
      joinInput.href,
    );
    if (joinInput.referrer) {
      TestValidator.equals(
        "session referrer matches input",
        session.referrer,
        joinInput.referrer,
      );
    }
    TestValidator.predicate(
      "session created_at is valid date-time",
      new Date(session.created_at) instanceof Date,
    );
    TestValidator.predicate(
      "session expired_at is valid date-time",
      new Date(session.expired_at) instanceof Date,
    );
  }
  // 8. Verify token object structure and fields
  const token = result.token;
  TestValidator.predicate(
    "access token is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    new Date(token.expired_at) instanceof Date,
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    new Date(token.refreshable_until) instanceof Date,
  );
  TestValidator.predicate(
    "expired_at is before refreshable_until",
    new Date(token.expired_at) < new Date(token.refreshable_until),
  );
}
