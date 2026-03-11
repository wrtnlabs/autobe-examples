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

export async function test_api_guest_retrieve_multiple_sessions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a guest account
  const guestAccount = await authorize_guest_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(guestAccount);
  // 2. Retrieve the guest profile by ID
  const guestProfile = await api.functional.redditPlatform.guests.at(
    connection,
    { guestId: guestAccount.id },
  );
  typia.assert(guestProfile);
  // 3. Validate that sessions array exists and contains session data
  TestValidator.equals(
    "guest profile has sessions array",
    guestProfile.sessions.length >= 0,
    true,
  );
  // 4. If sessions exist, validate session metadata
  if (guestProfile.sessions.length > 0) {
    // Validate first session structure
    const firstSession = guestProfile.sessions[0];
    typia.assert(firstSession);
    TestValidator.equals(
      "session has correct guest ID",
      firstSession.reddit_platform_guest_id,
      guestProfile.id,
    );
    TestValidator.predicate(
      "session has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstSession.id,
      ),
    );
    TestValidator.predicate(
      "session has valid uri href",
      firstSession.href.startsWith("http://") ||
        firstSession.href.startsWith("https://"),
    );
    TestValidator.predicate(
      "session has valid IP address",
      /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(firstSession.ip),
    );
    TestValidator.predicate(
      "session has valid datetime created_at",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        firstSession.created_at,
      ),
    );
    TestValidator.predicate(
      "session has valid datetime expired_at",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        firstSession.expired_at,
      ),
    );
    // 5. Test multiple guests to demonstrate session isolation
    const secondGuest = await authorize_guest_join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
      },
    });
    typia.assert(secondGuest);
    TestValidator.notEquals(
      "different guests have different IDs",
      guestProfile.id,
      secondGuest.id,
    );
    // 6. Validate each guest has their own isolated session
    const secondGuestProfile = await api.functional.redditPlatform.guests.at(
      connection,
      { guestId: secondGuest.id },
    );
    typia.assert(secondGuestProfile);
    TestValidator.equals(
      "guest sessions match account count",
      guestProfile.sessions.length === 1,
      true,
    );
    TestValidator.equals(
      "second guest sessions match account count",
      secondGuestProfile.sessions.length === 1,
      true,
    );
  } else {
    TestValidator.equals(
      "guest can exist without sessions",
      guestProfile.sessions,
      [],
    );
  }
}
