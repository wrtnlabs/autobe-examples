import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

export async function test_api_admin_user_profile_update_with_email_change(
  connection: api.IConnection,
) {
  // 1. Register first admin (admin A)
  const adminARequest = {
    email: `admin.a+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AdminA!234",
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 4 }),
    ip: "203.0.113.10",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminA = await api.functional.auth.adminUser.join(connection, {
    body: adminARequest,
  });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(adminA);

  // 2. Register second admin (admin B) whose profile will be updated
  const adminBRequest = {
    email: `admin.b+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AdminB!234",
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "203.0.113.11",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminB = await api.functional.auth.adminUser.join(connection, {
    body: adminBRequest,
  });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(adminB);

  // Basic sanity checks for authorized payloads
  TestValidator.predicate(
    "admin A and admin B must have different ids",
    adminA.id !== adminB.id,
  );
  TestValidator.predicate(
    "admin A and admin B must have different emails",
    adminA.email !== adminB.email,
  );

  // 3. Use admin B token to create an article category (admin-only endpoint)
  const categoryRequest = {
    code: `CAT_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryRequest },
    );
  typia.assert<IDiscussionBoardArticleCategory>(category);

  // 4. Update admin B profile with a new unique email and changed display name
  const newEmail = `admin.b.updated+${RandomGenerator.alphaNumeric(8)}@example.com`;
  TestValidator.predicate(
    "new email must differ from both original admin emails",
    newEmail !== adminA.email && newEmail !== adminB.email,
  );

  const updateBody = {
    email: newEmail,
    displayName: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdminuser.IUpdate;

  const updated: IDiscussionBoardAdminuser =
    await api.functional.discussionBoard.adminUser.adminUsers.update(
      connection,
      {
        adminUserId: adminB.id,
        body: updateBody,
      },
    );
  typia.assert<IDiscussionBoardAdminuser>(updated);

  // 5. Validate that profile fields have been updated as requested
  TestValidator.equals(
    "updated admin id must remain the same as admin B id",
    updated.id,
    adminB.id,
  );
  TestValidator.equals(
    "updated email must match the requested new email",
    updated.email,
    newEmail,
  );
  TestValidator.equals(
    "updated displayName must match the requested displayName",
    updated.displayName,
    updateBody.displayName,
  );

  // Additional sanity check: admin status and emailVerified are present and of expected primitive types.
  TestValidator.predicate(
    "accountStatus must be a non-empty string",
    typeof updated.accountStatus === "string" &&
      updated.accountStatus.length > 0,
  );
  TestValidator.predicate(
    "emailVerified must be a boolean",
    typeof updated.emailVerified === "boolean",
  );
}
