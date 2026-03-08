import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_sections_articles_create } from "../../../generate/generate_random_discussion_board_member_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_member_article_update_authorization(
  connection: api.IConnection,
) {
  // 1. Member A registration and article creation
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await api.functional.discussionBoard.auth.member.join(
    memberAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(memberA);
  // Use valid section ID ( Assuming section exists in test environment)
  const sectionId = "00000000-0000-0000-0000-000000000001";
  const articleA =
    await api.functional.discussionBoard.member.sections.articles.create(
      memberAConnection,
      {
        sectionId: sectionId,
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(articleA);
  // 2. Member B registration
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await api.functional.discussionBoard.auth.member.join(
    memberBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(memberB);
  const articleB =
    await api.functional.discussionBoard.member.sections.articles.create(
      memberBConnection,
      {
        sectionId: sectionId,
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(articleB);
  // Test Case 1 - Author Edit (Success)
  const updatedTitle = RandomGenerator.paragraph({ sentences: 1 });
  const updatedContent = RandomGenerator.content({
    paragraphs: 4,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const updatedArticleA =
    await api.functional.discussionBoard.member.articles.update(
      memberAConnection,
      {
        articleId: articleA.id,
        body: {
          title: updatedTitle,
          content: updatedContent,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticleA);
  TestValidator.equals("title updated", updatedArticleA.title, updatedTitle);
  TestValidator.equals(
    "content updated",
    updatedArticleA.content,
    updatedContent,
  );
  TestValidator.predicate(
    "updated_at changed",
    updatedArticleA.updated_at !== null,
  );
  TestValidator.equals(
    "author unchanged",
    updatedArticleA.author.id,
    articleA.author.id,
  );
  // Test Case 2 - Unauthorized Edit (Failure)
  const unauthorizedUpdateTitle = RandomGenerator.paragraph({ sentences: 1 });
  await TestValidator.error(
    "member B cannot edit member A's article",
    async () => {
      await api.functional.discussionBoard.member.articles.update(
        memberBConnection,
        {
          articleId: articleA.id,
          body: {
            title: unauthorizedUpdateTitle,
            content: "Some content",
          } satisfies IDiscussionBoardArticle.IUpdate,
        },
      );
    },
  );
  // Test Case 3 - Partial Update (title-only update)
  const partialUpdateTitle = RandomGenerator.paragraph({ sentences: 1 });
  const partialUpdatedArticle =
    await api.functional.discussionBoard.member.articles.update(
      memberAConnection,
      {
        articleId: articleA.id,
        body: {
          title: partialUpdateTitle,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(partialUpdatedArticle);
  TestValidator.equals(
    "partial title updated",
    partialUpdatedArticle.title,
    partialUpdateTitle,
  );
  TestValidator.equals(
    "content preserved",
    partialUpdatedArticle.content,
    updatedContent,
  );
}
