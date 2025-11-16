import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

/**
 * Validate updating lifecycle flags of an admin user profile.
 *
 * Business goal
 *
 * - Ensure that an authenticated adminUser can update another admin's
 *   lifecycle-related flags (accountStatus, emailVerified) and profile fields
 *   through the admin profile update endpoint.
 * - Confirm that the update response reflects the new values and that the admin
 *   context is able to perform other privileged operations.
 *
 * High-level flow
 *
 * 1. Register a first admin (controller) via POST /auth/adminUser/join.
 * 2. Register a second admin (managed target) via POST /auth/adminUser/join.
 * 3. Under the current admin context, create an article category via POST
 *    /discussionBoard/adminUser/articleCategories to prove privileged access.
 * 4. Call PUT /discussionBoard/adminUser/adminUsers/{adminUserId} for the managed
 *    admin using IDiscussionBoardAdminuser.IUpdate, updating accountStatus and
 *    emailVerified along with some profile metadata.
 * 5. Assert that the returned IDiscussionBoardAdminuser reflects the requested
 *    lifecycle flags and updated profile.
 */
export async function test_api_admin_user_profile_update_account_status_and_restrictions(
  connection: api.IConnection,
) {
  // 1. Join the first admin (controller).
  const controllerJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const controllerAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: controllerJoinRequest,
    });
  typia.assert(controllerAuthorized);

  // 2. Join the second admin (managed target).
  const managedJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const managedAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: managedJoinRequest,
    });
  typia.assert(managedAuthorized);

  // 3. Create an article category under the current admin context.
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const createdCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(createdCategory);

  // 4. Update the managed admin's lifecycle flags and profile.
  const newStatus = "suspended";
  const newEmailVerified = !managedAuthorized.emailVerified;
  const newDisplayName = `${managedAuthorized.displayName} (updated)`;

  const updateBody = {
    accountStatus: newStatus,
    emailVerified: newEmailVerified,
    displayName: newDisplayName,
  } satisfies IDiscussionBoardAdminuser.IUpdate;

  const updatedAdmin: IDiscussionBoardAdminuser =
    await api.functional.discussionBoard.adminUser.adminUsers.update(
      connection,
      {
        adminUserId: managedAuthorized.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAdmin);

  // 5. Validate that lifecycle flags and profile were updated as requested.
  TestValidator.equals(
    "updated admin accountStatus should match requested value",
    updatedAdmin.accountStatus,
    newStatus,
  );

  TestValidator.equals(
    "updated admin emailVerified should match requested value",
    updatedAdmin.emailVerified,
    newEmailVerified,
  );

  TestValidator.equals(
    "updated admin displayName should match requested value",
    updatedAdmin.displayName,
    newDisplayName,
  );

  TestValidator.equals(
    "managed admin id should remain stable after update",
    updatedAdmin.id,
    managedAuthorized.id,
  );
}
