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

export async function test_api_guest_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a guest account via join endpoint
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
  const authorized = await authorize_guest_join(connection, {
    body: joinInput,
  });
  typia.assert(authorized);
  const guestId = authorized.id;
  // 2. Retrieve the guest profile using the guest ID
  const guest = await api.functional.redditPlatform.guests.at(connection, {
    guestId,
  });
  typia.assert(guest);
  // 3. Verify all profile fields match registration data
  TestValidator.equals("guest ID matches", guest.id, guestId);
  TestValidator.equals(
    "email matches registration",
    guest.email,
    joinInput.email,
  );
  TestValidator.equals(
    "username matches registration",
    guest.username,
    joinInput.username,
  );
  TestValidator.equals(
    "display_name matches registration",
    guest.display_name,
    joinInput.display_name,
  );
  TestValidator.equals("bio matches registration", guest.bio, joinInput.bio);
  TestValidator.equals(
    "avatar_url matches registration",
    guest.avatar_url,
    null,
  );
  // 4. Verify karma is initialized to 0
  TestValidator.equals("karma initialized to 0", guest.karma, 0);
  // 5. Verify timestamps are valid date-time strings
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(Date.parse(guest.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(Date.parse(guest.updated_at)),
  );
  // 6. Verify deleted_at is NULL (account is active)
  TestValidator.equals(
    "deleted_at is NULL for active account",
    guest.deleted_at,
    null,
  );
  // 7. Verify sessions array exists and is valid
  TestValidator.predicate("sessions is array", Array.isArray(guest.sessions));
  // 8. Validate session structure if any sessions exist
  if (guest.sessions.length > 0) {
    const session = guest.sessions[0];
    typia.assert(session);
    TestValidator.equals(
      "session guest id matches",
      session.reddit_platform_guest_id,
      guestId,
    );
    TestValidator.predicate(
      "session has valid ip",
      typeof session.ip === "string" && session.ip.length > 0,
    );
    TestValidator.predicate(
      "session has valid href",
      typeof session.href === "string" && session.href.length > 0,
    );
    TestValidator.predicate(
      "session created_at is valid",
      () => !isNaN(Date.parse(session.created_at)),
    );
    TestValidator.predicate(
      "session expired_at is valid",
      () => !isNaN(Date.parse(session.expired_at)),
    );
  }
}
