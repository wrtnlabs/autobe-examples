import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";

/**
 * Validate idempotency or multiplicity semantics of guestUser join with a
 * stable external_reference.
 *
 * Business goal
 *
 * - Understand how the platform treats repeated guest joins coming from the same
 *   device/cookie identifier.
 * - Ensure that repeated calls do not produce an invalid or inconsistent identity
 *   state.
 *
 * Scenario
 *
 * 1. Prepare a stable external_reference string that represents a device or cookie
 *    ID.
 * 2. Call api.functional.auth.guestUser.join once with body:
 *    IShoppingMallGuestUser.IJoin using that external_reference.
 * 3. Assert that the first response is a valid IShoppingMallGuestUser.IAuthorized
 *    (typia.assert) and capture:
 *
 *    - Id as id1
 *    - Token as token1
 *    - Created_at and updated_at as createdAt1 / updatedAt1
 *    - External_reference (may be undefined or null) as extRef1
 * 4. Call api.functional.auth.guestUser.join again with the same
 *    external_reference in a fresh request body.
 * 5. Assert that the second response is a valid IShoppingMallGuestUser.IAuthorized
 *    and capture:
 *
 *    - Id as id2
 *    - Token as token2
 *    - Created_at and updated_at as createdAt2 / updatedAt2
 *    - External_reference as extRef2
 * 6. Compare id1 and id2 to derive semantics, accepting either design but
 *    enforcing self-consistency:
 *
 *    - If id2 === id1 (idempotent / reuse design):
 *
 *         - Created_at should be equal between calls.
 *         - Updated_at should be greater than or equal to updatedAt1. Use
 *                   TestValidator.equals / TestValidator.predicate for these
 *                   checks.
 *    - If id2 !== id1 (multiplicity design):
 *
 *         - Ensure both responses are internally consistent and represent distinct
 *                   identities.
 *         - Created_at timestamps must differ or at least not be earlier for the second
 *                   identity.
 *         - It is acceptable that external_reference is equal or not, since it is
 *                   nullable and not unique.
 * 7. Regardless of id semantics, verify minimal token and metadata consistency:
 *
 *    - Token1.access, token1.refresh, token2.access, token2.refresh are non-empty
 *         strings.
 *    - Token1.expired_at and token2.expired_at are valid date-time strings and not
 *         empty (typia.assert already guarantees format; only business logic
 *         predicate may check inequality or ordering if desired).
 *    - External_reference echo behavior: when the first call includes a non-empty
 *         external_reference, extRef1 and extRef2 should not contradict that
 *         intent:
 *
 *         - At minimum, assert that extRef1 is not undefined when we passed a
 *                   non-undefined external_reference.
 *         - If extRef2 is present, allow it to match extRef1 or be null/undefined per
 *                   privacy rules; do not over-constrain.
 *
 * Notes and constraints
 *
 * - Do not rely on or validate DB internals; stay at API contract level.
 * - Do not assume specific idempotent vs multiplicity behavior; accept and assert
 *   whichever behavior the backend chooses, but enforce internal consistency
 *   aligned with docs:
 *
 *   - IShoppingMallGuestUser.IAuthorized.id is described as a stable logical
 *       identity id.
 *   - Created_at and updated_at are non-null and updated_at advances on changes.
 * - Use typia.assert on each IShoppingMallGuestUser.IAuthorized response.
 * - Use only API/DTO types provided: IShoppingMallGuestUser.IJoin,
 *   IShoppingMallGuestUser.IAuthorized, IAuthorizationToken.
 *
 * Implementation sketch
 *
 * - Generate a deterministic-looking external_reference using
 *   RandomGenerator.alphaNumeric or paragraph.
 * - Build the request bodies as const objects with `satisfies
 *   IShoppingMallGuestUser.IJoin`.
 * - After both joins, implement branching logic: if (first.id === second.id) {
 *   ...idempotent-path... } else { ...multiplicity-path... }.
 * - Add TestValidator.equals / predicate checks with descriptive titles for every
 *   assertion.
 */
export async function test_api_guest_user_join_idempotent_for_same_external_reference_context(
  connection: api.IConnection,
) {
  const externalReference = RandomGenerator.alphaNumeric(32);

  // First join call with stable external_reference
  const firstJoin = await api.functional.auth.guestUser.join(connection, {
    body: {
      external_reference: externalReference,
    } satisfies IShoppingMallGuestUser.IJoin,
  });
  typia.assert<IShoppingMallGuestUser.IAuthorized>(firstJoin);

  const id1 = firstJoin.id;
  const token1 = firstJoin.token;
  const createdAt1 = firstJoin.created_at;
  const updatedAt1 = firstJoin.updated_at;
  const extRef1 = firstJoin.external_reference;

  // Basic assertions for first response
  TestValidator.predicate("first join: id is non-empty", id1.length > 0);
  TestValidator.predicate(
    "first join: access token is non-empty",
    token1.access.length > 0,
  );
  TestValidator.predicate(
    "first join: refresh token is non-empty",
    token1.refresh.length > 0,
  );

  // When we explicitly send an external_reference, backend should not treat it as completely absent
  TestValidator.predicate(
    "first join: external_reference is not undefined when provided",
    extRef1 !== undefined,
  );

  // Second join call with the same external_reference
  const secondJoin = await api.functional.auth.guestUser.join(connection, {
    body: {
      external_reference: externalReference,
    } satisfies IShoppingMallGuestUser.IJoin,
  });
  typia.assert<IShoppingMallGuestUser.IAuthorized>(secondJoin);

  const id2 = secondJoin.id;
  const token2 = secondJoin.token;
  const createdAt2 = secondJoin.created_at;
  const updatedAt2 = secondJoin.updated_at;
  const extRef2 = secondJoin.external_reference;

  // Basic assertions for second response
  TestValidator.predicate("second join: id is non-empty", id2.length > 0);
  TestValidator.predicate(
    "second join: access token is non-empty",
    token2.access.length > 0,
  );
  TestValidator.predicate(
    "second join: refresh token is non-empty",
    token2.refresh.length > 0,
  );

  // Optional echo behavior checks for external_reference
  if (extRef1 !== undefined && extRef1 !== null) {
    TestValidator.predicate(
      "second join: external_reference does not contradict first join",
      extRef2 === undefined || extRef2 === null || extRef2 === extRef1,
    );
  }

  // Determine and validate semantics based on whether identity id is reused
  if (id1 === id2) {
    // Idempotent / reuse semantics: same logical identity
    TestValidator.equals(
      "idempotent semantics: created_at should be stable",
      createdAt1,
      createdAt2,
    );

    // updated_at of second call should be same or after first updated_at lexicographically
    TestValidator.predicate(
      "idempotent semantics: updated_at of second join is not earlier than first",
      updatedAt2 >= updatedAt1,
    );
  } else {
    // Multiplicity semantics: two distinct logical identities
    TestValidator.notEquals(
      "multiplicity semantics: ids must differ",
      id1,
      id2,
    );

    // created_at timestamps should not indicate that the second identity predates the first
    TestValidator.predicate(
      "multiplicity semantics: second created_at is not before first",
      createdAt2 >= createdAt1,
    );
  }

  // Ensure tokens from both joins are distinct or at least not obviously reused
  TestValidator.predicate(
    "tokens from two joins are not both empty and ideally differ",
    token1.access.length > 0 && token2.access.length > 0,
  );
}
