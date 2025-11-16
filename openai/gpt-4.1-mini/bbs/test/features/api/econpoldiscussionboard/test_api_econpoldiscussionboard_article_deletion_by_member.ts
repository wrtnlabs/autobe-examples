import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardArticle";
import type { IEconPolDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAttachment";
import type { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";

export async function test_api_econpoldiscussionboard_article_deletion_by_member(
  connection: api.IConnection,
) {
  // Step 1: Member joins (registers) and authenticates
  const memberBody = {
    username: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
  } satisfies IEconPolDiscussionBoardMember.ICreate;
  const member: IEconPolDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberBody });
  typia.assert(member);
  // Step 2: Create an article as the authenticated member
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    attachments: [],
  } satisfies IEconPolDiscussionBoardArticle.ICreate;
  const article: IEconPolDiscussionBoardArticle =
    await api.functional.econPolDiscussionBoard.member.articles.create(
      connection,
      { body: articleBody },
    );
  typia.assert(article);

  // Step 3: Delete the created article
  await api.functional.econPolDiscussionBoard.member.articles.erase(
    connection,
    { id: article.id },
  );

  // Step 4: Attempt to get the deleted article by listing or similar approach.
  // However, since no function is provided for "get article by id" endpoint,
  // we verify deletion by attempting to delete again or expect an error
  // upon deletion if exists. Here, we'll test deleting again results in an error.
  await TestValidator.error(
    "deleting the same article again should fail",
    async () => {
      await api.functional.econPolDiscussionBoard.member.articles.erase(
        connection,
        { id: article.id },
      );
    },
  );
}
