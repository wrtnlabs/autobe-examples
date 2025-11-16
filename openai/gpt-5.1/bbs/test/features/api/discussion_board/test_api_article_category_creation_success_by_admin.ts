import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

export async function test_api_article_category_creation_success_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an adminUser
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new article category as the authenticated admin
  const categoryBody = {
    code: `ECONOMY_TEST_${RandomGenerator.alphaNumeric(6)}`,
    name: "Economy (Test) Category",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const createdCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(createdCategory);

  // 3. Business-level validations on response
  // 3-1. id must be a non-empty UUID (format already validated by typia.assert)
  TestValidator.predicate(
    "created category id should be non-empty",
    createdCategory.id.length > 0,
  );

  // 3-2. code, name, description, order should match request body
  TestValidator.equals(
    "created category code matches request",
    createdCategory.code,
    categoryBody.code,
  );
  TestValidator.equals(
    "created category name matches request",
    createdCategory.name,
    categoryBody.name,
  );
  TestValidator.equals(
    "created category description matches request",
    createdCategory.description ?? null,
    categoryBody.description ?? null,
  );
  TestValidator.equals(
    "created category order matches request",
    createdCategory.order,
    categoryBody.order,
  );

  // 3-3. created_at and updated_at are populated (non-empty strings) - type/format already validated
  TestValidator.predicate(
    "created_at should be non-empty",
    createdCategory.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be non-empty",
    createdCategory.updated_at.length > 0,
  );

  // 3-4. deleted_at should be null or undefined for a newly created active category
  TestValidator.equals(
    "deleted_at should be null or undefined for new category",
    createdCategory.deleted_at ?? null,
    null,
  );
}
