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

export async function test_api_comment_deletion_prevention_for_non_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Comment Author (first member)
  const commentAuthorConnection: api.IConnection = { host: connection.host };
  const commentAuthorResponse = await authorize_member_join(
    commentAuthorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEconomicPoliticalBoardMember.IJoin,
    },
  );
  typia.assert(commentAuthorResponse);
  const commentAuthorId = commentAuthorResponse.id;
  // 2. Create an article as Comment Author
  const articleResponse =
    await api.functional.economicPoliticalBoard.member.articles.create(
      commentAuthorConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          section_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(articleResponse);
  const articleId = articleResponse.id;
  // 3. Register Non-Comment Author (second member)
  const nonAuthorConnection: api.IConnection = { host: connection.host };
  const nonAuthorResponse = await authorize_member_join(nonAuthorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(nonAuthorResponse);
  // 4. Create a comment on the article as Comment Author
  const commentResponse =
    await api.functional.economicPoliticalBoard.member.articles.comments.create(
      commentAuthorConnection,
      {
        articleId: articleId,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEconomicPoliticalBoardComment.ICreate,
      },
    );
  typia.assert(commentResponse);
  const commentId = commentResponse.id;
  // Verify comment exists and belongs to comment author
  TestValidator.equals(
    "comment author matches",
    commentResponse.author.userId,
    commentAuthorId,
  );
  // 5. Attempt to delete comment using Non-Comment Author (should fail with 403)
  await TestValidator.error("non-author cannot delete comment", async () => {
    await api.functional.economicPoliticalBoard.member.articles.comments.erase(
      nonAuthorConnection,
      {
        articleId: articleId,
        commentId: commentId,
      },
    );
  });
}
