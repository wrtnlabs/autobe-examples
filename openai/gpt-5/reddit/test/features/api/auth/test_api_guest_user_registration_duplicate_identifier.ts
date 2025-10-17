import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestUser";

export async function test_api_guest_user_registration_duplicate_identifier(
  connection: api.IConnection,
) {
  // 1) Prepare a unique, immutable registration payload
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    terms_accepted_at: typia.random<string & tags.Format<"date-time">>(),
    privacy_accepted_at: typia.random<string & tags.Format<"date-time">>(),
    marketing_opt_in: RandomGenerator.pick([true, false] as const),
  } satisfies ICommunityPlatformGuestUser.IJoin;

  // 2) First join attempt (should succeed)
  const first = await api.functional.auth.guestUser.join(connection, {
    body: joinBody,
  });
  typia.assert(first);

  // 3) Duplicate attempt with identical payload
  let second: ICommunityPlatformGuestUser.IAuthorized | null = null;
  let duplicateErrored = false;
  try {
    const result = await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });
    typia.assert(result);
    second = result;
  } catch (_err) {
    duplicateErrored = true;
  }

  // 4) Validate acceptable behaviors
  if (second !== null) {
    // Idempotent reuse: must reference the same subject
    TestValidator.equals(
      "idempotent duplicate join returns the same user id",
      second.id,
      first.id,
    );
    if (second.role !== undefined) {
      TestValidator.equals(
        "role must be guestUser when present",
        second.role,
        "guestUser",
      );
    }
  } else {
    // Conflict-style behavior: ensure an error occurred
    TestValidator.predicate(
      "duplicate join rejected by server",
      duplicateErrored === true,
    );
  }
}
