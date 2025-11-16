import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates administrator ability to update a platform user's profile and
 * account status.
 *
 * Steps:
 *
 * 1. Register administrator account and authenticate to obtain required token for
 *    privileged operations.
 * 2. Create or identify a test user to update. Since there is no user create API,
 *    assume a fixture user or pre-existing userId.
 * 3. Prepare update DTO changing email, status, and business_status, ensuring not
 *    to touch immutable fields.
 * 4. Perform user update using PUT
 *    /communityPlatform/administrator/users/{userId}.
 * 5. Validate returned values match update request and unchanged/immutable fields
 *    are not altered.
 * 6. Confirm that excluded fields like password_hash or created_at remain
 *    untouched.
 */
export async function test_api_administrator_user_profile_update_success(
  connection: api.IConnection,
) {
  // 1. Register an administrator and obtain tokens for authorization
  const adminCreateInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_status: RandomGenerator.pick([
      null,
      "onboarding",
      "internal",
      "superuser",
    ]),
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const adminAuth: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateInput,
    });
  typia.assert(adminAuth);

  // 2. There is no user create endpoint, so simulate an existing user (fixture) for update
  // We generate a userId for demonstration, but in a real environment, this would come from fixture or DB
  const userId = typia.random<string & tags.Format<"uuid">>();
  // Prepare a simulated "existing" user snapshot before update for later comparison
  // This would be a fixture in real tests; here we use random for demo
  const preUser: ICommunityPlatformUser = {
    id: userId,
    email: typia.random<string & tags.Format<"email">>(),
    status: RandomGenerator.pick([
      "active",
      "pending",
      "deactivated",
      "banned",
    ]),
    business_status: RandomGenerator.pick([
      null,
      "review",
      "onboarding",
      "partner",
    ]),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  // 3. Build the update request allowed by ICommunityPlatformUser.IUpdate
  const updateInput = {
    email: typia.random<string & tags.Format<"email">>(),
    status: RandomGenerator.pick([
      "active",
      "pending",
      "deactivated",
      "banned",
    ]),
    business_status: RandomGenerator.pick([
      null,
      "review",
      "onboarding",
      "partner",
    ] as const),
  } satisfies ICommunityPlatformUser.IUpdate;

  // 4. Call the user update API as administrator
  const updatedUser: ICommunityPlatformUser =
    await api.functional.communityPlatform.administrator.users.update(
      connection,
      {
        userId,
        body: updateInput,
      },
    );
  typia.assert(updatedUser);

  // 5. Validate updated fields match updateInput
  if (updateInput.email !== undefined) {
    TestValidator.equals(
      "email is updated",
      updatedUser.email,
      updateInput.email,
    );
  }
  if (updateInput.status !== undefined) {
    TestValidator.equals(
      "status is updated",
      updatedUser.status,
      updateInput.status,
    );
  }
  if ("business_status" in updateInput) {
    // Accept undefined, null, or string
    TestValidator.equals(
      "business_status is updated",
      updatedUser.business_status,
      updateInput.business_status === undefined
        ? preUser.business_status
        : updateInput.business_status,
    );
  }

  // 6. Ensure immutable fields are not changed unexpectedly
  TestValidator.equals("user id is unchanged", updatedUser.id, preUser.id);
  TestValidator.equals(
    "created_at is unchanged",
    updatedUser.created_at,
    preUser.created_at,
  );
  // updated_at may change after update; do not validate equality
  // deleted_at should remain null for an active user
  TestValidator.equals(
    "deleted_at remains null for active user",
    updatedUser.deleted_at,
    null,
  );
}
