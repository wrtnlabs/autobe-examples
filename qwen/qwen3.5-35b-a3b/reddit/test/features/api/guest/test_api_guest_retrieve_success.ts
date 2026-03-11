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

export async function test_api_guest_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a guest account using the utility function
  // Create a new connection object for the guest join operation
  const guestConnection: api.IConnection = { host: connection.host };
  const createdGuest = await authorize_guest_join(guestConnection, {
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
  typia.assert(createdGuest);
  // Step 2: Retrieve the guest profile using the guestId
  const retrievedGuest = await api.functional.redditPlatform.guests.at(
    connection,
    {
      guestId: createdGuest.id,
    },
  );
  typia.assert(retrievedGuest);
  // Step 3: Validate all required fields match creation data
  TestValidator.equals("guest id matches", retrievedGuest.id, createdGuest.id);
  TestValidator.equals(
    "email matches",
    retrievedGuest.email,
    createdGuest.email,
  );
  TestValidator.equals(
    "username matches",
    retrievedGuest.username,
    createdGuest.username,
  );
  TestValidator.equals(
    "display_name matches",
    retrievedGuest.display_name,
    createdGuest.display_name,
  );
  TestValidator.equals(
    "karma matches",
    retrievedGuest.karma,
    createdGuest.karma,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedGuest.created_at,
    createdGuest.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedGuest.updated_at,
    createdGuest.updated_at,
  );
  TestValidator.equals("deleted_at is null", retrievedGuest.deleted_at, null);
  // Validate sessions array exists
  TestValidator.predicate(
    "sessions array exists",
    Array.isArray(retrievedGuest.sessions),
  );
  // Validate session metadata if sessions exist
  if (retrievedGuest.sessions.length > 0) {
    const session = retrievedGuest.sessions[0];
    typia.assert(session);
    // Validate session id is UUID format
    TestValidator.predicate(
      "session id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
    );
    // Validate session reddit_platform_guest_id matches guest id
    TestValidator.equals(
      "session reddit_platform_guest_id matches",
      session.reddit_platform_guest_id,
      createdGuest.id,
    );
    // Validate session href is valid URI
    TestValidator.predicate(
      "session href is valid URI",
      session.href !== undefined && session.href.length > 0,
    );
    // Validate session referrer can be null or valid URI
    TestValidator.predicate(
      "session referrer is nullable URI",
      session.referrer === null ||
        (session.referrer !== undefined && session.referrer.length > 0),
    );
    // Validate session ip is not empty
    TestValidator.predicate(
      "session ip is not empty",
      session.ip !== undefined && session.ip !== null && session.ip.length > 0,
    );
    // Validate session created_at is ISO date-time format
    TestValidator.predicate(
      "session created_at is ISO date-time",
      session.created_at.includes("T"),
    );
    // Validate session expired_at is ISO date-time format
    TestValidator.predicate(
      "session expired_at is ISO date-time",
      session.expired_at.includes("T"),
    );
  }
}
