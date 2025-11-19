import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validates public access to get the detail of a discussion board article by
 * id.
 *
 * 1. Register as a new discussion board user.
 * 2. Create a new article as the authenticated user.
 * 3. Retrieve the created article by its id as a normal (authenticated) user and
 *    confirm all returned data is correct.
 * 4. Log out to simulate unauthenticated access and fetch the article detail again
 *    publicly, confirming the same details are accessible.
 * 5. Negative test: Attempt to get article with a random non-existent articleId,
 *    expect error.
 * 6. (If system logic supports soft-delete hiding for normal/public users): later
 *    tests might perform a soft-delete then confirm the endpoint returns
 *    not-found for soft-deleted ids unless privileged (not covered here since
 *    no delete API is available).
 */
export async function test_api_article_detail_public_access(
  connection: api.IConnection,
) {
  // Step 1: Register a new user
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<72> & tags.Format<"password">
  >();
  const user: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Create an article as this user
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 12,
  });
  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 18,
    wordMin: 4,
    wordMax: 12,
  });
  const created: IDiscussionBoardArticle =
    await api.functional.discussionBoard.user.articles.create(connection, {
      body: {
        title: articleTitle,
        content: articleContent,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(created);

  // Step 3: Fetch article as authenticated user
  const got: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.at(connection, {
      articleId: created.id,
    });
  typia.assert(got);
  TestValidator.equals("fetched article id matches", got.id, created.id);
  TestValidator.equals(
    "fetched article title matches",
    got.title,
    articleTitle,
  );
  TestValidator.equals(
    "fetched article content matches",
    got.content,
    articleContent,
  );
  TestValidator.equals(
    "fetched article author's id matches",
    got.author.id,
    user.id,
  );
  TestValidator.equals(
    "fetched article author's email matches",
    got.author.email,
    user.email,
  );

  // Step 4: Fetch article as unauthenticated (public) user
  const publicConnection: api.IConnection = { ...connection, headers: {} };
  const publicGot: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.at(publicConnection, {
      articleId: created.id,
    });
  typia.assert(publicGot);
  TestValidator.equals(
    "public user access: article id",
    publicGot.id,
    created.id,
  );
  TestValidator.equals(
    "public user access: article title",
    publicGot.title,
    articleTitle,
  );
  TestValidator.equals(
    "public user access: author id",
    publicGot.author.id,
    user.id,
  );

  // Step 5: Attempt to fetch non-existent article (should fail with error)
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "not found for non-existent articleId",
    async () => {
      await api.functional.discussionBoard.articles.at(publicConnection, {
        articleId: fakeId,
      });
    },
  );
}
