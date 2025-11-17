import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

export async function test_api_guest_join_new_account_creation(
  connection: api.IConnection,
) {
  // Prepare guest join request payload
  const guestJoinRequest: IRedditCommunityGuest.IJoin = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: `https://example.com/session/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://example.com/referrer/${RandomGenerator.alphaNumeric(6)}`,
  };

  // Call API to register guest user
  const guestUser: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestJoinRequest,
    });
  typia.assert(guestUser);

  // Validate UUID format of guest ID
  TestValidator.predicate(
    "id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      guestUser.id,
    ),
  );

  // Validate href and referrer match input
  TestValidator.equals(
    "href equals request href",
    guestUser.href,
    guestJoinRequest.href,
  );
  TestValidator.equals(
    "referrer equals request referrer",
    guestUser.referrer,
    guestJoinRequest.referrer,
  );

  // Validate session id is non-empty string
  TestValidator.predicate(
    "session_id is non-empty string",
    typeof guestUser.session_id === "string" && guestUser.session_id.length > 0,
  );

  // Validate creation timestamp
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(Date.parse(guestUser.created_at)),
  );

  // updated_at can be null or undefined, check if present then validate
  if (guestUser.updated_at !== null && guestUser.updated_at !== undefined) {
    TestValidator.predicate(
      "updated_at is valid date",
      !isNaN(Date.parse(guestUser.updated_at)),
    );
  }

  // Validate token structure
  const token: IAuthorizationToken = guestUser.token;
  TestValidator.predicate(
    "token.access is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is valid date",
    !isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.predicate(
    "token.refreshable_until is valid date",
    !isNaN(Date.parse(token.refreshable_until)),
  );
}
