import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityOwner";

/**
 * Verify that an authenticated community owner can rotate their password.
 *
 * Flow:
 *
 * 1. Register (join) a new community owner with valid consents to obtain an
 *    authenticated session (SDK sets Authorization automatically).
 * 2. Change password using the correct current password and a compliant new
 *    password.
 * 3. Validate that the response is IAuthorized and the owner id remains unchanged.
 * 4. Perform a second rotation using the new password as current_password to prove
 *    that the first rotation actually took effect (without touching headers or
 *    re-login).
 *
 * Notes:
 *
 * - Do NOT manipulate connection.headers; SDK handles authentication state.
 * - Do NOT validate HTTP status codes or perform type-error tests.
 */
export async function test_api_community_owner_password_change_success(
  connection: api.IConnection,
) {
  // 1) Prepare registration input with compliant fields
  const email = typia.random<string & tags.Format<"email">>();
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[A-Za-z0-9_]{3,20}$">
  >();
  const originalPassword = RandomGenerator.alphaNumeric(12);

  const joinBody = {
    email,
    username,
    password: originalPassword,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
  } satisfies ICommunityPlatformCommunityOwner.ICreate;

  // 2) Register and obtain authorized context (SDK auto-sets Authorization)
  const owner = await api.functional.auth.communityOwner.join(connection, {
    body: joinBody,
  });
  typia.assert(owner);

  // 3) First password rotation: current -> new
  const newPassword1 = RandomGenerator.alphaNumeric(14);
  const rotated1 =
    await api.functional.auth.communityOwner.password.changePassword(
      connection,
      {
        body: {
          current_password: originalPassword,
          new_password: newPassword1,
        } satisfies ICommunityPlatformCommunityOwner.IChangePassword,
      },
    );
  typia.assert(rotated1);
  TestValidator.equals(
    "owner id remains unchanged after first rotation",
    rotated1.id,
    owner.id,
  );
  TestValidator.predicate(
    "role present must be communityOwner",
    rotated1.role === undefined || rotated1.role === "communityOwner",
  );

  // 4) Second rotation using the just-updated credential to prove success
  const newPassword2 = RandomGenerator.alphaNumeric(16);
  const rotated2 =
    await api.functional.auth.communityOwner.password.changePassword(
      connection,
      {
        body: {
          current_password: newPassword1,
          new_password: newPassword2,
        } satisfies ICommunityPlatformCommunityOwner.IChangePassword,
      },
    );
  typia.assert(rotated2);
  TestValidator.equals(
    "owner id remains unchanged after second rotation",
    rotated2.id,
    owner.id,
  );
}
