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

export async function test_api_guest_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create guest-specific connection for the join operation
  const guestConnection: api.IConnection = { host: connection.host };
  // Create guest account using utility function (not SDK directly)
  const output = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph() ?? null,
      avatar_url: typia.random<string & tags.Format<"uri">>() ?? null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    } satisfies IRedditPlatformGuest.IJoin,
  });
  // Validate complete response structure with typia.assert
  typia.assert(output);
  // Validate guest account identifiers exist and have correct types
  TestValidator.predicate(
    "guest id is uuid format",
    /^[0-9a-f-]{36}$/i.test(output.id),
  );
  TestValidator.predicate("email is valid format", output.email.includes("@"));
  // Validate optional fields can be null or present
  TestValidator.predicate(
    "bio can be null",
    output.bio === null || typeof output.bio === "string",
  );
  TestValidator.predicate(
    "avatar_url can be null",
    output.avatar_url === null || typeof output.avatar_url === "string",
  );
  // Validate karma is int32 and starts at 0 for new guest
  TestValidator.equals("initial karma is 0", output.karma, 0);
  // Validate deleted_at is null for new account (not deleted)
  TestValidator.equals("account not deleted", output.deleted_at, null);
  // Validate sessions array exists
  TestValidator.predicate("has sessions array", Array.isArray(output.sessions));
  // Validate session summaries when sessions exist
  if (output.sessions.length > 0) {
    const session = output.sessions[0];
    TestValidator.predicate(
      "session has id",
      session.id !== null && session.id !== undefined,
    );
    TestValidator.equals(
      "session guest id matches",
      session.reddit_platform_guest_id,
      output.id,
    );
    TestValidator.predicate("session has href", session.href !== null);
    TestValidator.predicate("session has ip", session.ip !== null);
    TestValidator.predicate(
      "session has created_at",
      session.created_at !== null,
    );
    TestValidator.predicate(
      "session has expired_at",
      session.expired_at !== null,
    );
  }
  // Validate authorization token structure has all required fields
  TestValidator.predicate(
    "token has access",
    output.token.access !== null && output.token.access !== undefined,
  );
  TestValidator.predicate(
    "token has refresh",
    output.token.refresh !== null && output.token.refresh !== undefined,
  );
  TestValidator.predicate(
    "token has expired_at",
    output.token.expired_at !== null && output.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "token has refreshable_until",
    output.token.refreshable_until !== null &&
      output.token.refreshable_until !== undefined,
  );
  // Validate token expiration timestamps are valid date-time strings
  TestValidator.predicate(
    "token expired_at format valid",
    output.token.expired_at.includes("T"),
  );
  TestValidator.predicate(
    "token refreshable_until format valid",
    output.token.refreshable_until.includes("T"),
  );
}
