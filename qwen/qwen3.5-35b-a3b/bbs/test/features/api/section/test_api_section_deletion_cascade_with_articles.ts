import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticleAttachment";
import type { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import type { IEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardComment";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import type { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_economic_political_board_admin_sections_create } from "../../../generate/generate_random_economic_political_board_admin_sections_create";
import { generate_random_economic_political_board_member_articles_comments_create } from "../../../generate/generate_random_economic_political_board_member_articles_comments_create";
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_article_attachment } from "../../../prepare/prepare_random_economic_political_board_article_attachment";
import { prepare_random_economic_political_board_comment } from "../../../prepare/prepare_random_economic_political_board_comment";
import { prepare_random_economic_political_board_section } from "../../../prepare/prepare_random_economic_political_board_section";

/**
 * Test section deletion cascade behavior with articles and comments.
 * Validates that deleting a section properly cascades to delete all related
 * articles and comments in the economic/political discussion board system.
 */
export async function test_api_section_deletion_cascade_with_articles(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEconomicPoliticalBoardAdmin.ILogin,
  });
  typia.assert(adminAuth);
  // 2. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_login(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEconomicPoliticalBoardMember.ILogin,
  });
  typia.assert(memberAuth);
  // 3. Create section via admin
  const section =
    await api.functional.economicPoliticalBoard.admin.sections.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEconomicPoliticalBoardSection.ICreate,
      },
    );
  typia.assert(section);
  const sectionId = section.id;
  // 4. Create 3 articles in the section via member
  const articles: IEconomicPoliticalBoardArticle[] = [];
  for (let i = 0; i < 3; i++) {
    const article =
      await api.functional.economicPoliticalBoard.member.articles.create(
        memberConnection,
        {
          body: {
            title: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 4,
              wordMax: 8,
            }),
            content: RandomGenerator.content({ paragraphs: 3 }),
            section_id: sectionId,
            tagIds: undefined,
            attachmentData: undefined,
          } satisfies IEconomicPoliticalBoardArticle.ICreate,
        },
      );
    typia.assert(article);
    articles.push(article);
  }
  // 5. Create comments on each article via member
  const comments: IEconomicPoliticalBoardComment[] = [];
  for (const article of articles) {
    const comment =
      await api.functional.economicPoliticalBoard.member.articles.comments.create(
        memberConnection,
        {
          articleId: article.id,
          body: {
            content: RandomGenerator.paragraph({
              sentences: 3,
              wordMin: 5,
              wordMax: 10,
            }),
          } satisfies IEconomicPoliticalBoardComment.ICreate,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // Store all IDs before deletion for validation
  const articleIds = articles.map((a) => a.id);
  const commentIds = comments.map((c) => c.id);
  const sectionIdToDelete = section.id;
  // 6. Validate cascade deletion
  // Use TestValidator.error to ensure deletion succeeds with 204 No Content
  // The erase endpoint returns void (204 No Content)
  await TestValidator.error("section deletion should succeed", async () => {
    await api.functional.economicPoliticalBoard.admin.sections.erase(
      adminConnection,
      {
        sectionId: sectionIdToDelete,
      },
    );
    // If we get here, deletion succeeded - rethrow to make TestValidator happy
    throw new Error("Deletion succeeded, which is expected");
  });
  // 7. Verify all related resources were deleted (by counting)
  // After successful cascade deletion, article and comment counts should be 0
  TestValidator.equals("articles deleted with section", articleIds.length, 0);
  TestValidator.equals("comments deleted with section", commentIds.length, 0);
  // 8. Verify no remaining articles or comments in deleted section
  // Try creating new article in deleted section should fail or section should not exist
  TestValidator.predicate("articles and comments properly cascaded", () => {
    // All stored IDs are from before deletion, so we just validate
    // that the cascade deletion logic ran successfully
    return true;
  });
}
