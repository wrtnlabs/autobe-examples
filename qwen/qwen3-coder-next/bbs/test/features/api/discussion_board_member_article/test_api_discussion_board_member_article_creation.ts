import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
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

export async function test_api_discussion_board_member_article_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberProfile = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        passwordConfirmation: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(memberProfile);
  // Use the member connection for subsequent operations
  memberConnection.headers = { Authorization: memberProfile.token.access };
  // 2. Get sections to find a valid section_id
  const sections = await api.functional.discussionBoard.sections.index(
    memberConnection,
    {
      body: {
        limit: 100,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(sections);
  if (sections.data.length === 0) {
    throw new Error("No sections available for article creation test");
  }
  const sectionId = sections.data[0].id;
  // 3. Create article with valid data
  const article = await api.functional.discussionBoard.member.articles.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: sectionId,
        tags: [RandomGenerator.name(2), RandomGenerator.name(2)],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 4. Validate article structure
  TestValidator.equals(
    "author id matches",
    article.author.id,
    memberProfile.id,
  );
  TestValidator.equals("section id matches", article.section.id, sectionId);
  TestValidator.predicate(
    "has positive comments count",
    article.comments_count >= 0,
  );
  TestValidator.predicate(
    "has valid creation timestamp",
    new Date(article.created_at) <= new Date(),
  );
  // 5. Test error scenarios
  // Create a member connection without authorization
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access", async () => {
    await api.functional.discussionBoard.member.articles.create(
      unauthorizedConnection,
      {
        body: {
          title: "Unauthorized article",
          content: "This should fail",
          section_id: sectionId,
          tags: [],
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  });
  // Test with valid but non-existent section ID
  const fakeSectionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent section_id", async () => {
    await api.functional.discussionBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: "Article with invalid section",
          content: "This should fail",
          section_id: fakeSectionId,
          tags: [],
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  });
}
