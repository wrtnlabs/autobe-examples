import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleCategory";
import type { IShoppingMallArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleComment";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * This test validates the ability of an authenticated customer to retrieve a
 * specific comment from a shopping mall article category after creating the
 * category and the comment.
 *
 * The test flow is:
 *
 * 1. Authenticate a new customer (join).
 * 2. Create a new shopping mall article category.
 * 3. Create a comment under the above category.
 * 4. Retrieve that same comment using its ID and the category ID.
 *
 * Each step asserts that the returned data matches the expected shape and
 * values, and that the correct associations exist. The test uses typia
 * assertions for full type safety.
 *
 * This validates that authorization, data integrity, and retrieval correctness
 * are enforced.
 */
export async function test_api_shopping_mall_article_category_comment_specific_retrieval_with_authentication_and_prerequisites(
  connection: api.IConnection,
) {
  // 1. Authenticate a new shopping mall customer (join)
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = "password1234";
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: password,
        full_name: RandomGenerator.name(),
        ip: null,
        href: `https://example.com/signup`,
        referrer: `https://example.com/referrer`,
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create a new shopping mall article category
  const categoryName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const articleCategoryCreateBody = {
    name: categoryName,
    description: RandomGenerator.content({ paragraphs: 1 }),
    parent_id: null,
  } satisfies IShoppingMallArticleCategory.ICreate;
  const articleCategory: IShoppingMallArticleCategory =
    await api.functional.shoppingMall.customer.shoppingMallArticleCategories.create(
      connection,
      {
        body: articleCategoryCreateBody,
      },
    );
  typia.assert(articleCategory);

  // 3. Create a comment under the category
  const commentContent: string = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 15,
  });
  const commentCreateBody = {
    content: commentContent,
    metadata: null,
  } satisfies IShoppingMallArticleComment.ICreate;
  const comment: IShoppingMallArticleComment =
    await api.functional.shoppingMall.customer.shoppingMallArticleCategories.comments.create(
      connection,
      {
        shoppingMallArticleCategoryId: articleCategory.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // Validate the comment's association
  TestValidator.equals(
    "comment's category id matches",
    comment.shopping_mall_article_category_id,
    articleCategory.id,
  );

  // 4. Retrieve the specific comment by categoryId and commentId
  const retrievedComment: IShoppingMallArticleComment =
    await api.functional.shoppingMall.shoppingMallArticleCategories.comments.at(
      connection,
      {
        shoppingMallArticleCategoryId: articleCategory.id,
        shoppingMallArticleCommentId: comment.id,
      },
    );
  typia.assert(retrievedComment);

  // Validate that retrieved comment data matches the created comment data
  TestValidator.equals(
    "retrieved comment id matches created",
    retrievedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "retrieved comment content matches created",
    retrievedComment.content,
    comment.content,
  );
  TestValidator.equals(
    "retrieved comment category id matches created",
    retrievedComment.shopping_mall_article_category_id,
    comment.shopping_mall_article_category_id,
  );
  // Validate timestamps exist and are strings
  TestValidator.predicate(
    "retrieved comment has created_at datetime string",
    typeof retrievedComment.created_at === "string" &&
      retrievedComment.created_at.length > 0,
  );
  // updated_at might be null or undefined or string
  TestValidator.predicate(
    "retrieved comment updated_at is either null, undefined, or string",
    retrievedComment.updated_at === null ||
      retrievedComment.updated_at === undefined ||
      (typeof retrievedComment.updated_at === "string" &&
        retrievedComment.updated_at.length > 0),
  );
}
