import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

/**
 * Validate that an authenticated adminUser can update basic mutable fields of a
 * discussion-board article category identified by its business code.
 *
 * Business flow covered:
 *
 * 1. Register a new adminUser with POST /auth/adminUser/join.
 * 2. As that adminUser, create an article category with POST
 *    /discussionBoard/adminUser/articleCategories.
 * 3. Update the category’s name, description, and order via PUT
 *    /discussionBoard/adminUser/articleCategories/{categoryCode}, keeping the
 *    business code stable.
 * 4. Verify that mutable fields are changed, immutable identifiers are preserved,
 *    and audit fields behave correctly (created_at stable, updated_at
 *    refreshed, deleted_at still null/undefined).
 */
export async function test_api_article_category_update_basic_fields_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser and obtain authenticated context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: RandomGenerator.alphabets(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an initial article category as this adminUser.
  const initialCode: string = `CAT_${RandomGenerator.alphabets(8).toUpperCase()}`;
  const initialName: string = RandomGenerator.name(2);
  const initialDescription: string = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 10,
  });
  const initialOrder = typia.random<number & tags.Type<"int32">>();

  const createBody = {
    code: initialCode,
    name: initialName,
    description: initialDescription,
    order: initialOrder,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const createdCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdCategory);

  // Capture baseline values for comparison.
  const createdId = createdCategory.id;
  const createdCode = createdCategory.code;
  const createdName = createdCategory.name;
  const createdDescription = createdCategory.description ?? null;
  const createdOrder = createdCategory.order;
  const createdCreatedAt = createdCategory.created_at;
  const createdUpdatedAt = createdCategory.updated_at;
  const createdDeletedAt = createdCategory.deleted_at ?? null;

  // Sanity checks on creation.
  TestValidator.equals(
    "created category code matches requested code",
    createdCode,
    initialCode,
  );
  TestValidator.equals(
    "created category name matches requested name",
    createdName,
    initialName,
  );
  TestValidator.equals(
    "created category description matches requested description",
    createdDescription,
    initialDescription,
  );
  TestValidator.equals(
    "created category order matches requested order",
    createdOrder,
    initialOrder,
  );

  // 3. Update mutable fields via PUT using the category code as identifier.
  const updatedName: string = RandomGenerator.name(3);
  const updatedDescription: string = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 10,
  });
  const updatedOrder = typia.random<number & tags.Type<"int32">>();

  const updateBody = {
    name: updatedName,
    description: updatedDescription,
    order: updatedOrder,
  } satisfies IDiscussionBoardArticleCategory.IUpdate;

  const updatedCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.update(
      connection,
      {
        categoryCode: createdCode,
        body: updateBody,
      },
    );
  typia.assert(updatedCategory);

  // 4. Assertions: verify identifiers and fields after update.

  // Immutable identifiers should remain stable.
  TestValidator.equals(
    "category id is preserved after update",
    updatedCategory.id,
    createdId,
  );
  TestValidator.equals(
    "category code is preserved after update",
    updatedCategory.code,
    createdCode,
  );

  // Mutable fields should reflect updated values.
  TestValidator.equals(
    "category name is updated",
    updatedCategory.name,
    updatedName,
  );
  TestValidator.equals(
    "category description is updated",
    updatedCategory.description ?? null,
    updatedDescription,
  );
  TestValidator.equals(
    "category order is updated",
    updatedCategory.order,
    updatedOrder,
  );

  // Ensure at least one mutable field actually changed from original values.
  TestValidator.notEquals(
    "updated category name differs from original name",
    updatedCategory.name,
    createdName,
  );
  TestValidator.notEquals(
    "updated category order differs from original order",
    updatedCategory.order,
    createdOrder,
  );

  // Audit field behavior: created_at stable, updated_at refreshed, deleted_at unchanged.
  TestValidator.equals(
    "created_at is unchanged after update",
    updatedCategory.created_at,
    createdCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at is refreshed after update",
    updatedCategory.updated_at,
    createdUpdatedAt,
  );

  const updatedDeletedAt = updatedCategory.deleted_at ?? null;
  TestValidator.equals(
    "deleted_at remains unchanged and nullish after update",
    updatedDeletedAt,
    createdDeletedAt,
  );
}
