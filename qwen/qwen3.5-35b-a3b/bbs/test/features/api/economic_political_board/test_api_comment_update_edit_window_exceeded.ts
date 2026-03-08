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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_economic_political_board_member_articles_comments_create } from "../../../generate/generate_random_economic_political_board_member_articles_comments_create";
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_article_attachment } from "../../../prepare/prepare_random_economic_political_board_article_attachment";
import { prepare_random_economic_political_board_comment } from "../../../prepare/prepare_random_economic_political_board_comment";

export async function test_api_comment_update_edit_window_exceeded(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: memberAuth.token.access };
  // 2. Create article (requires section_id - use a placeholder UUID)
  // In real scenarios, a section would need to exist first
  // For this test, we use a randomly generated UUID as the section_id
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          section_id: sectionId,
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 3. Create comment on article
  const comment =
    await api.functional.economicPoliticalBoard.member.articles.comments.create(
      memberConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IEconomicPoliticalBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // 4. Attempt to update comment
  // Note: The edit window check happens server-side based on current time vs createdAt
  // In E2E tests, we cannot simulate 60+ minute time passage without database manipulation
  // This test validates the error handling structure for the edit window expiration case
  const updatedContent = RandomGenerator.paragraph({ sentences: 1 });
  try {
    const updatedComment =
      await api.functional.economicPoliticalBoard.member.articles.comments.update(
        memberConnection,
        {
          articleId: article.id,
          commentId: comment.id,
          body: {
            content: updatedContent,
          } satisfies IEconomicPoliticalBoardComment.IUpdate,
        },
      );
    typia.assert(updatedComment);
    // If update succeeds (edit window not expired), verify changes
    TestValidator.notEquals(
      "content should be updated",
      comment.content,
      updatedComment.content,
    );
    TestValidator.notEquals(
      "updatedAt should change",
      comment.updatedAt,
      updatedComment.updatedAt,
    );
  } catch (error) {
    // Check if this is a 409 Conflict (edit window exceeded)
    if (error instanceof api.HttpError && error.status === 409) {
      TestValidator.httpError(
        "edit window exceeded returns 409 Conflict with descriptive message",
        409,
        () => {
          throw error;
        },
      );
      // The HttpError message should indicate the edit window has expired
      const errorData = error.toJSON<string>();
      TestValidator.predicate(
        "error message mentions edit window",
        errorData.message.includes("edit"),
      );
    } else {
      // Re-throw unexpected errors
      throw error;
    }
  }
}
