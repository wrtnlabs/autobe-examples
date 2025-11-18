import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserMetadata";

/**
 * Ensure guest user detail ignores logically deleted or non-existent records.
 *
 * ## Business intent
 *
 * The todoApp service tracks guest identities in the `todo_app_guestusers`
 * table, exposing them via the guestUser detail endpoint: GET
 * /todoApp/guestUser/guestUsers/{guestUserId} which returns an
 * ITodoAppGuestUser snapshot.
 *
 * Logical deletion is modeled by the nullable `deleted_at` column. When
 * `deleted_at` is non-null, the record should be treated as retired and must
 * not be presented as an active guest user detail to callers operating in the
 * guestUser context. Conversely, records whose `deleted_at` is null remain
 * active and should be fully retrievable.
 *
 * Within this E2E test harness we cannot directly toggle `deleted_at` in the
 * database, so we validate the observable behaviors we _can_ drive through the
 * public SDK while honoring type safety and compilation constraints.
 *
 * ## Scenario steps
 *
 * 1. Create two independent guest user identities via POST /auth/guestUser/join
 *    using the SDK function api.functional.auth.guestUser.join.
 *
 *    - Each call accepts ITodoAppGuestUser.IJoin as its body and returns
 *         ITodoAppGuestUser.IAuthorized, which includes the guest id and
 *         token.
 *    - We assert the authorized payload structure with typia.assert and keep the
 *         `id` fields as guestUserIdA and guestUserIdB.
 * 2. For each authorized guest id, call the detail endpoint:
 *    api.functional.todoApp.guestUser.guestUsers.at(connection, { guestUserId
 *    })
 *
 *    - The response type is ITodoAppGuestUser; assert it with typia.assert.
 *    - Validate via TestValidator.equals that `detail.id` matches the authorized
 *         `id` that was used to query it.
 *    - As a sanity check on active status, verify that `detail.deleted_at` is either
 *         null or undefined, since join must not return a guest whose
 *         deleted_at is non-null at issuance time.
 * 3. Simulate a lookup of a non-existent (or logically deleted) guest user id.
 *
 *    - Generate a random UUID-like value that is guaranteed not to equal either
 *         guestUserIdA or guestUserIdB. For example, loop until typia.random
 *         returns an id distinct from both.
 *    - Invoke the detail endpoint with this unknown id, wrapped inside
 *         TestValidator.error with an async callback and awaited, to assert
 *         that the call fails with some HttpError (not-found or
 *         domain-specific).
 *    - We deliberately do not assert a specific HTTP status code; only that an error
 *         is thrown and the endpoint does not succeed for a clearly unknown
 *         id.
 * 4. Confirm isolation of records.
 *
 *    - After the error scenario, re-call the detail endpoint for guestUserIdA (or B)
 *         and confirm it still succeeds and returns a matching id, proving that
 *         an error for one id does not affect other active guest records.
 *
 * ## Implementation notes
 *
 * - Use only the imports provided by the template (api, typia, TestValidator,
 *   RandomGenerator, ArrayUtil, ITodoAppGuestUser, IAuthorizationToken,
 *   ITodoAppGuestUserMetadata).
 * - Do not touch connection.headers directly; the join call already manages
 *   Authorization headers via the SDK.
 * - Never send invalid types or shapes; use ITodoAppGuestUser.IJoin for join
 *   request bodies and rely on typia.assert for all responses.
 * - Do not test specific HTTP status codes in the error case; only that an error
 *   is raised for an obviously unknown guestUserId.
 */
export async function test_api_guest_user_detail_ignores_deleted_records(
  connection: api.IConnection,
) {
  // 1. Create two active guest users via the public join endpoint.
  const authorizedA = await api.functional.auth.guestUser.join(connection, {
    body: typia.random<ITodoAppGuestUser.IJoin>(),
  });
  typia.assert<ITodoAppGuestUser.IAuthorized>(authorizedA);

  const authorizedB = await api.functional.auth.guestUser.join(connection, {
    body: typia.random<ITodoAppGuestUser.IJoin>(),
  });
  typia.assert<ITodoAppGuestUser.IAuthorized>(authorizedB);

  // 2. Fetch detail for each authorized guest id and validate active state.
  const detailA = await api.functional.todoApp.guestUser.guestUsers.at(
    connection,
    { guestUserId: authorizedA.id },
  );
  typia.assert<ITodoAppGuestUser>(detailA);
  TestValidator.equals(
    "detail for guest A should match authorized id",
    detailA.id,
    authorizedA.id,
  );
  TestValidator.predicate(
    "guest A should not be logically deleted (deleted_at null or undefined)",
    detailA.deleted_at === null || detailA.deleted_at === undefined,
  );

  const detailB = await api.functional.todoApp.guestUser.guestUsers.at(
    connection,
    { guestUserId: authorizedB.id },
  );
  typia.assert<ITodoAppGuestUser>(detailB);
  TestValidator.equals(
    "detail for guest B should match authorized id",
    detailB.id,
    authorizedB.id,
  );
  TestValidator.predicate(
    "guest B should not be logically deleted (deleted_at null or undefined)",
    detailB.deleted_at === null || detailB.deleted_at === undefined,
  );

  // 3. Simulate a lookup for a non-existent / logically deleted guest id.
  // Ensure the unknown id does not collide with existing ones.
  const existingIds: string[] = [authorizedA.id, authorizedB.id];
  let unknownId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  while (existingIds.includes(unknownId)) {
    unknownId = typia.random<string & tags.Format<"uuid">>();
  }

  await TestValidator.error(
    "detail endpoint should fail for non-existent or logically deleted guest id",
    async () => {
      await api.functional.todoApp.guestUser.guestUsers.at(connection, {
        guestUserId: unknownId,
      });
    },
  );

  // 4. Re-verify that an existing active guest is still retrievable.
  const detailAAgain = await api.functional.todoApp.guestUser.guestUsers.at(
    connection,
    { guestUserId: authorizedA.id },
  );
  typia.assert<ITodoAppGuestUser>(detailAAgain);
  TestValidator.equals(
    "detail for guest A remains accessible after error scenario",
    detailAAgain.id,
    authorizedA.id,
  );
}
