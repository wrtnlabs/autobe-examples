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

export async function test_api_comment_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create article by the member
  const article =
    await generate_random_economic_political_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          section_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 3. Create comment on the article by the same member
  const comment =
    await generate_random_economic_political_board_member_articles_comments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEconomicPoliticalBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  const originalContent = comment.content;
  const originalUpdatedAt = comment.updatedAt;
  // 4. Update the comment with new content
  const newContent = RandomGenerator.paragraph({ sentences: 4 });
  const updateBefore = new Date();
  const updatedComment =
    await api.functional.economicPoliticalBoard.member.articles.comments.update(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          content: newContent,
        } satisfies IEconomicPoliticalBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 5. Validate update success
  TestValidator.equals(
    "content is updated",
    updatedComment.content,
    newContent,
  );
  TestValidator.notEquals(
    "updatedAt is updated",
    updatedComment.updatedAt,
    originalUpdatedAt,
  );
  TestValidator.predicate(
    "updatedAt is after update attempt",
    new Date(updatedComment.updatedAt) > updateBefore,
  );
  // 6. Test multiple sequential updates
  const secondContent = RandomGenerator.paragraph({ sentences: 5 });
  const thirdContent = RandomGenerator.paragraph({ sentences: 6 });
  const update2Before = new Date();
  const updatedComment2 =
    await api.functional.economicPoliticalBoard.member.articles.comments.update(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          content: secondContent,
        } satisfies IEconomicPoliticalBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment2);
  TestValidator.equals(
    "second update content",
    updatedComment2.content,
    secondContent,
  );
  TestValidator.notEquals(
    "second updatedAt is updated",
    updatedComment2.updatedAt,
    updatedComment.updatedAt,
  );
  TestValidator.predicate(
    "second updatedAt is after second update attempt",
    new Date(updatedComment2.updatedAt) > update2Before,
  );
  const update3Before = new Date();
  const updatedComment3 =
    await api.functional.economicPoliticalBoard.member.articles.comments.update(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          content: thirdContent,
        } satisfies IEconomicPoliticalBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment3);
  TestValidator.equals(
    "third update content",
    updatedComment3.content,
    thirdContent,
  );
  TestValidator.notEquals(
    "third updatedAt is updated",
    updatedComment3.updatedAt,
    updatedComment2.updatedAt,
  );
  TestValidator.predicate(
    "third updatedAt is after third update attempt",
    new Date(updatedComment3.updatedAt) > update3Before,
  );
}
