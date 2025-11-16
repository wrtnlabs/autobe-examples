import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate idempotent behavior for guest user creation with duplicate
 * temporary_identifier.
 *
 * Business context: Platform admin and internal services can persist anonymous
 * visitors as guest users in shopping_mall_guestuser using POST
 * /shoppingMall/platformAdmin/guestUsers. The schema and documentation state
 * that implementations "should guarantee idempotency with respect to their own
 * business rules when the same temporary_identifier is submitted multiple
 * times, either by reusing an existing row or by defining clear semantics for
 * duplicate guests".
 *
 * This test does not enforce a specific business rule (reuse vs. duplicate vs.
 * rejection) because that is implementation-defined. Instead, it validates
 * consistent, type-safe behavior across two identical create requests made by
 * the same authenticated platform admin using the same temporary_identifier and
 * user_agent payload.
 *
 * Steps:
 *
 * 1. Join as a new platform admin using api.functional.auth.platformAdmin.join
 *    with a properly shaped IShoppingMallPlatformAdminJoin.IRequest body. The
 *    SDK will automatically attach the returned access token to the connection
 *    headers.
 * 2. Construct a deterministic IShoppingMallGuestUser.ICreate payload with a
 *    specific temporary_identifier and user_agent string.
 * 3. Call api.functional.shoppingMall.platformAdmin.guestUsers.create with the
 *    payload and capture the first IShoppingMallGuestUser result.
 * 4. Call the same endpoint again with an identical payload and capture the second
 *    IShoppingMallGuestUser result.
 * 5. Use typia.assert to fully validate both responses against
 *    IShoppingMallGuestUser.
 * 6. Use TestValidator to assert logical consistency between the two results:
 *
 *    - If ids are equal, assert that core fields like temporary_identifier and
 *         user_agent are also equal (strict reuse behavior).
 *    - If ids differ, assert that each individual response is self-consistent and
 *         that both share the same temporary_identifier and user_agent values
 *         (duplicate but coherent behavior).
 *
 * The goal is to ensure that duplicate temporary_identifier submissions do not
 * produce type-inconsistent or logically incoherent guest user records, while
 * allowing different platform implementations to choose their preferred
 * idempotency semantics.
 */
export async function test_api_platform_admin_guest_user_creation_idempotency_on_duplicate_temporary_identifier(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authorized context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Prepare deterministic guest user create payload
  const temporaryIdentifier: string = RandomGenerator.alphaNumeric(24);
  const userAgent: string =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  const guestCreateBody = {
    temporary_identifier: temporaryIdentifier,
    user_agent: userAgent,
  } satisfies IShoppingMallGuestUser.ICreate;

  // 3. First guest user creation
  const firstGuest: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      {
        body: guestCreateBody,
      },
    );
  typia.assert(firstGuest);

  // 4. Second guest user creation with identical payload
  const secondGuest: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      {
        body: guestCreateBody,
      },
    );
  typia.assert(secondGuest);

  // 5. Basic type-safe checks on individual responses
  TestValidator.predicate(
    "first guest id must be a non-empty string",
    () => firstGuest.id.length > 0,
  );
  TestValidator.predicate(
    "second guest id must be a non-empty string",
    () => secondGuest.id.length > 0,
  );

  // 6. Idempotency / logical consistency checks
  if (firstGuest.id === secondGuest.id) {
    // Reuse behavior: same record returned
    TestValidator.equals(
      "temporary_identifier must match when ids are equal",
      firstGuest.temporary_identifier,
      secondGuest.temporary_identifier,
    );
    TestValidator.equals(
      "user_agent must match when ids are equal",
      firstGuest.user_agent,
      secondGuest.user_agent,
    );
  } else {
    // Duplicate but coherent behavior: different ids but same tracking values
    TestValidator.notEquals(
      "ids are different when implementation chooses duplicate rows",
      firstGuest.id,
      secondGuest.id,
    );
    TestValidator.equals(
      "temporary_identifier remains the same across duplicates",
      firstGuest.temporary_identifier,
      secondGuest.temporary_identifier,
    );
    TestValidator.equals(
      "user_agent remains the same across duplicates",
      firstGuest.user_agent,
      secondGuest.user_agent,
    );
  }
}
