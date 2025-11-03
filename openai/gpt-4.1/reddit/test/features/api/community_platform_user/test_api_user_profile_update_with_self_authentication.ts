import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test self profile update for community platform user.
 *
 * 1. Register a new user and verify profile properties from join response.
 * 2. Update profile display name via /communityPlatform/user/users/{userId} with
 *    self-authentication.
 * 3. Validate that only display_name is updated and all other fields remain
 *    unchanged (including email, created_at).
 * 4. Try to update a deleted/nonexistent user (simulate by random uuid) and
 *    confirm API rejects the operation.
 */
export async function test_api_user_profile_update_with_self_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new user (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    href: "https://test.registration/page",
    referrer: "https://referrer.domain.com/",
  } satisfies ICommunityPlatformUser.IJoin;
  const authorized = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);
  const userId = authorized.id;

  // 2. Update display_name as the authenticated user
  const newDisplayName = RandomGenerator.name(2);
  const updateRes = await api.functional.communityPlatform.user.users.update(
    connection,
    {
      userId,
      body: {
        display_name: newDisplayName,
      } satisfies ICommunityPlatformUser.IUpdate,
    },
  );
  typia.assert(updateRes);
  TestValidator.equals(
    "display_name updated",
    updateRes.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "email should remain unchanged",
    updateRes.email,
    joinBody.email,
  );
  TestValidator.equals("id unchanged", updateRes.id, userId);
  TestValidator.equals(
    "created_at unchanged",
    updateRes.created_at,
    authorized.created_at,
  );
  TestValidator.notEquals(
    "updated_at should refresh after update",
    updateRes.updated_at,
    authorized.updated_at,
  );
  TestValidator.equals("still active user", updateRes.deleted_at, null);

  // 3. Try to update a deleted/nonexistent user (simulate by random uuid).
  await TestValidator.error(
    "updating nonexistent user should fail",
    async () => {
      await api.functional.communityPlatform.user.users.update(connection, {
        userId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          display_name: RandomGenerator.name(2),
        },
      });
    },
  );
}
