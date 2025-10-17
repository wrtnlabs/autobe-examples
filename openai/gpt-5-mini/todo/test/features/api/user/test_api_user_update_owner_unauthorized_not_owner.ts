import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_update_owner_unauthorized_not_owner(
  connection: api.IConnection,
) {
  /**
   * Ensure ownership enforcement when updating user profiles.
   *
   * Steps:
   *
   * 1. Create two distinct users (owner and otherUser) via POST /auth/user/join
   *    using independent unauthenticated connection copies.
   * 2. Authenticate as otherUser and attempt to PUT /todoApp/user/users/{ownerId}
   *    to modify the owner's display_name. Expect the operation to throw (not
   *    allowed).
   * 3. Authenticate as owner (ownerConn already has owner's token) and perform a
   *    legitimate update of the owner's display_name to verify the owner can
   *    update their own profile and that the owner's id remains unchanged.
   *
   * Note: A GET user endpoint is not available in the provided SDK, so we
   * verify state by attempting a legitimate owner update after the unauthorized
   * attempt.
   */

  // --- Prepare independent unauthenticated connections ---
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const otherConn: api.IConnection = { ...connection, headers: {} };

  // --- Create owner user ---
  const ownerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123",
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppUser.ICreate;

  const ownerAuth: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(ownerConn, { body: ownerCreateBody });
  typia.assert(ownerAuth);

  // --- Create other user ---
  const otherCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123",
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppUser.ICreate;

  const otherAuth: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(otherConn, { body: otherCreateBody });
  typia.assert(otherAuth);

  // --- Unauthorized attempt: otherUser tries to update owner's profile ---
  await TestValidator.error(
    "other user should NOT be able to update another user's profile",
    async () => {
      await api.functional.todoApp.user.users.update(otherConn, {
        userId: ownerAuth.id,
        body: {
          display_name: "unauthorized-modification",
        } satisfies ITodoAppUser.IUpdate,
      });
    },
  );

  // --- Legitimate owner update to verify owner can change profile ---
  const ownerNewDisplayName = RandomGenerator.name();
  const updated: ITodoAppUser = await api.functional.todoApp.user.users.update(
    ownerConn,
    {
      userId: ownerAuth.id,
      body: {
        display_name: ownerNewDisplayName,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(updated);

  // Business assertions
  TestValidator.equals(
    "owner id remains identical after owner update",
    updated.id,
    ownerAuth.id,
  );
  TestValidator.equals(
    "owner display_name updated by owner",
    updated.display_name,
    ownerNewDisplayName,
  );
}
