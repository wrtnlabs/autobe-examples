import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

export async function test_api_admin_user_profile_update_self(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin user via join API
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const authorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(authorized);

  // Use the admin user's id from the authorized session for subsequent operations
  const adminUserId: string = authorized.id;
  const originalEmail = authorized.email;
  const originalCreatedAt = authorized.createdAt;
  const originalUpdatedAt = authorized.updatedAt;
  const originalStatus = authorized.status;

  // 2. Create an admin-only article category to exercise admin context
  const categoryCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const createdCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(createdCategory);

  // 3. Prepare self profile update payload (do not change email)
  const newDisplayName = RandomGenerator.name();
  const newBio = RandomGenerator.paragraph({ sentences: 5 });

  // If originalStatus is already "active", switch to a different but valid value; otherwise set to "active".
  const nextStatus = originalStatus === "active" ? "suspended" : "active";

  const updateBody = {
    displayName: newDisplayName,
    bio: newBio,
    accountStatus: nextStatus,
  } satisfies IDiscussionBoardAdminuser.IUpdate;

  const updated: IDiscussionBoardAdminuser =
    await api.functional.discussionBoard.adminUser.adminUsers.update(
      connection,
      {
        adminUserId,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Business assertions on update result
  TestValidator.equals("id should match adminUserId", updated.id, adminUserId);

  TestValidator.equals(
    "email should remain unchanged after profile update",
    updated.email,
    originalEmail,
  );

  TestValidator.equals(
    "displayName should be updated to new value",
    updated.displayName,
    newDisplayName,
  );

  TestValidator.equals(
    "bio should be updated to new value",
    updated.bio,
    newBio,
  );

  TestValidator.equals(
    "accountStatus should reflect updated lifecycle status",
    updated.accountStatus,
    nextStatus,
  );

  TestValidator.equals(
    "createdAt should remain the original creation timestamp",
    updated.createdAt,
    originalCreatedAt,
  );

  TestValidator.notEquals(
    "updatedAt should change after profile update",
    updated.updatedAt,
    originalUpdatedAt,
  );

  // Ensure updatedAt is not earlier than createdAt (lexicographical comparison of ISO strings)
  TestValidator.predicate(
    "updatedAt should be later than or equal to createdAt",
    updated.updatedAt >= updated.createdAt,
  );
}
