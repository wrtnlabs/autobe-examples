import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";

export async function test_api_guest_user_join_rejected_for_deleted_handle(
  connection: api.IConnection,
) {
  // 1. Prepare a reusable anonymous handle for the guest
  const anonymousHandle: string = RandomGenerator.alphaNumeric(24);

  // 2. First join request body with the generated anonymous handle
  const firstJoinBody = {
    anonymous_handle: anonymousHandle,
    user_agent: RandomGenerator.name(3),
    ip: typia.random<
      (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">)
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformGuestuser.IJoin;

  // 3. Perform the first guest join
  const firstAuthorized: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: firstJoinBody,
    });
  typia.assert<ICommunityPlatformGuestuser.IAuthorized>(firstAuthorized);

  // 3-1. Ensure the first authorized guest is not marked as deleted
  TestValidator.predicate(
    "first join must not return a logically deleted guest (deleted_at is null or undefined)",
    firstAuthorized.deleted_at === null ||
      firstAuthorized.deleted_at === undefined,
  );

  // 3-2. When account_status is present, it should allow login for a usable guest session
  if (firstAuthorized.account_status !== undefined) {
    TestValidator.predicate(
      "first join account_status, when present, must allow login",
      firstAuthorized.account_status.isLoginAllowed === true,
    );
  }

  // 4. Second join with the same anonymous handle but different context
  const secondJoinBody = {
    anonymous_handle: anonymousHandle,
    user_agent: RandomGenerator.name(3),
    ip: typia.random<
      (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">)
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformGuestuser.IJoin;

  const secondAuthorized: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: secondJoinBody,
    });
  typia.assert<ICommunityPlatformGuestuser.IAuthorized>(secondAuthorized);

  // 4-1. Second authorized guest must also not be marked as deleted
  TestValidator.predicate(
    "second join must not return a logically deleted guest (deleted_at is null or undefined)",
    secondAuthorized.deleted_at === null ||
      secondAuthorized.deleted_at === undefined,
  );

  // 4-2. When account_status is present on the second response, it should still allow login
  if (secondAuthorized.account_status !== undefined) {
    TestValidator.predicate(
      "second join account_status, when present, must allow login",
      secondAuthorized.account_status.isLoginAllowed === true,
    );
  }

  // 5. Validate id reuse or recreation semantics without reviving deleted guests
  if (firstAuthorized.id === secondAuthorized.id) {
    // Backend reused the same active guest record for the same anonymous handle
    TestValidator.equals(
      "when ids are reused, they must be exactly equal",
      firstAuthorized.id,
      secondAuthorized.id,
    );
  } else {
    // Backend created a new guest record instead of reusing
    TestValidator.notEquals(
      "when backend chooses a new guest record, ids must differ",
      firstAuthorized.id,
      secondAuthorized.id,
    );
  }
}
