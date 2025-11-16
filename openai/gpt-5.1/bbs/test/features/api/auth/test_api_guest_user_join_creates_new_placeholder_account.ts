import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestUser";

export async function test_api_guest_user_join_creates_new_placeholder_account(
  connection: api.IConnection,
) {
  // 1. Prepare a realistic anonymous token and optional context fields
  const anonymousToken: string = RandomGenerator.alphaNumeric(32);

  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const ip: string = RandomGenerator.alphaNumeric(3);

  const joinBody = {
    anonymous_token: anonymousToken,
    ip,
    href,
    referrer,
  } satisfies IDiscussionBoardGuestUser.IJoin;

  // 2. Call the guestUser join endpoint
  const authorizedGuest = await api.functional.auth.guestUser.join(connection, {
    body: joinBody,
  });

  // 3. Type-level validation of the response
  typia.assert<IDiscussionBoardGuestUser.IAuthorized>(authorizedGuest);

  // 4. Business and invariants validation
  // 4-1. Anonymous token must be echoed back exactly
  TestValidator.equals(
    "anonymous_token is echoed back",
    authorizedGuest.anonymous_token,
    anonymousToken,
  );

  // 4-2. deleted_at must be null or undefined for a fresh guest
  TestValidator.predicate(
    "deleted_at is null or undefined for new guest",
    () =>
      authorizedGuest.deleted_at === null ||
      authorizedGuest.deleted_at === undefined,
  );

  // 4-3. Token basics: access/refresh must be non-empty strings
  const token: IAuthorizationToken = authorizedGuest.token;

  TestValidator.predicate("access token is non-empty", token.access.length > 0);

  TestValidator.predicate(
    "refresh token is non-empty",
    token.refresh.length > 0,
  );
}
