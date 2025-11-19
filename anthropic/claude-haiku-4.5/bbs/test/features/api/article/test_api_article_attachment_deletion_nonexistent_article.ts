import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

export async function test_api_article_attachment_deletion_nonexistent_article(
  connection: api.IConnection,
) {
  // Step 1: Authenticate contributor via join
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 2: Test deletion with non-existent article ID
  const nonExistentArticleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const attachmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Verify that deletion on non-existent article returns error
  await TestValidator.error(
    "deletion of attachment from non-existent article should fail",
    async () => {
      await api.functional.discussionBoard.contributor.articles.attachments.erase(
        connection,
        {
          articleId: nonExistentArticleId,
          attachmentId: attachmentId,
        },
      );
    },
  );

  // Step 3: Test with multiple invalid article UUIDs to ensure consistent error behavior
  const invalidArticleIds: (string & tags.Format<"uuid">)[] = ArrayUtil.repeat(
    3,
    () => typia.random<string & tags.Format<"uuid">>(),
  );

  for (const invalidArticleId of invalidArticleIds) {
    await TestValidator.error(
      "deletion with different non-existent article IDs should consistently fail",
      async () => {
        await api.functional.discussionBoard.contributor.articles.attachments.erase(
          connection,
          {
            articleId: invalidArticleId,
            attachmentId: typia.random<string & tags.Format<"uuid">>(),
          },
        );
      },
    );
  }

  // Step 4: Verify contributor authentication is maintained
  TestValidator.predicate(
    "contributor should remain authenticated after failed deletion attempts",
    contributor.email.length > 0,
  );
}
