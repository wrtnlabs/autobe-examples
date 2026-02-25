import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_section_change_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    passwordConfirmation: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardMember.IJoin;
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.discussionBoard.auth.member.join(memberConnection, {
      body: memberData,
    });
  typia.assert(member);
  // 2. Create two sections for testing
  const originalSection = typia.random<IDiscussionBoardSection.ISummary>();
  const newSection = typia.random<IDiscussionBoardSection.ISummary>();
  // 3. Create initial article in original section
  const initialArticleData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content: RandomGenerator.content({ paragraphs: 3 }),
    section_id: originalSection.id as string & tags.Format<"uuid">,
  } satisfies IDiscussionBoardArticle.ICreate;
  const initialArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(
      memberConnection,
      {
        body: initialArticleData,
      },
    );
  typia.assert(initialArticle);
  // 4. Update article to change section and content
  const updatedContent = RandomGenerator.content({ paragraphs: 5 });
  const updateData = {
    content: updatedContent,
    section_id: newSection.id as string & tags.Format<"uuid">,
  } satisfies IDiscussionBoardArticle.IUpdate;
  const updatedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.update(
      memberConnection,
      {
        articleId: initialArticle.id,
        body: updateData,
      },
    );
  typia.assert(updatedArticle);
  // 5. Validate section change and content update
  TestValidator.equals(
    "section changed to new section",
    updatedArticle.section.id,
    newSection.id,
  );
  TestValidator.equals(
    "content updated to new content",
    updatedArticle.content,
    updatedContent,
  );
}
