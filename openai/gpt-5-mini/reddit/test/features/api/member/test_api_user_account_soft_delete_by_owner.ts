import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";

/**
 * Soft-delete (owner) E2E test for community portal member accounts.
 *
 * Purpose:
 *
 * - Create a new community member via POST /auth/member/join
 * - Soft-delete that account via DELETE /communityPortal/member/users/{userId}
 * - Confirm deletion manifests as failure on subsequent delete attempt
 *
 * Notes:
 *
 * - The SDK provides only join() and erase() for this domain. GET/login endpoints
 *   are not available in the provided SDK materials, therefore this test
 *   verifies deletion by performing a second erase() call and asserting that it
 *   fails (proxy for "user no longer available").
 */
export async function test_api_user_account_soft_delete_by_owner(
  connection: api.IConnection,
) {
  // 1) Create a fresh member account
  const createBody = {
    username: `test_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: `P@ssw0rd!${RandomGenerator.alphaNumeric(4)}`,
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const authorized: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: createBody,
    });

  // Validate response shape and token presence
  typia.assert(authorized);
  TestValidator.predicate(
    "join returned authorization token",
    typeof authorized.token?.access === "string" &&
      authorized.token.access.length > 0,
  );

  // Capture created user id
  const userId: string & tags.Format<"uuid"> = authorized.id;
  TestValidator.predicate(
    "created user id is present",
    typeof userId === "string" && userId.length > 0,
  );

  // 2) Owner requests soft-delete for their account
  await api.functional.communityPortal.member.users.erase(connection, {
    userId,
  });

  // 3) Attempt to delete the same account again and expect failure (proxy for not-found / already-deleted)
  await TestValidator.error(
    "deleting an already-deleted account should fail",
    async () => {
      await api.functional.communityPortal.member.users.erase(connection, {
        userId,
      });
    },
  );
}
