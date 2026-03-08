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

export async function test_api_comment_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email"> & tags.MaxLength<255> & tags.MinLength<1>
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  // 2. Create section (admin only)
  const section =
    await api.functional.economicPoliticalBoard.admin.sections.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IEconomicPoliticalBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Member setup - create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email"> & tags.MaxLength<255> & tags.MinLength<1>
      >(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 4. Create article (member only) in the created section
  const article =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          section_id: section.id,
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 5. Create comment on the article (member only)
  const commentContent = RandomGenerator.paragraph({ sentences: 3 });
  const comment =
    await api.functional.economicPoliticalBoard.member.articles.comments.create(
      memberConnection,
      {
        articleId: article.id,
        body: {
          content: commentContent,
        } satisfies IEconomicPoliticalBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // 6. Verify comment response structure
  TestValidator.equals("comment author id", comment.author.id, memberAuth.id);
  TestValidator.equals("comment article id", comment.article.id, article.id);
  TestValidator.equals("comment content", comment.content, commentContent);
  TestValidator.notEquals(
    "comment has createdAt",
    comment.createdAt,
    undefined,
  );
  TestValidator.notEquals(
    "comment has updatedAt",
    comment.updatedAt,
    undefined,
  );
  TestValidator.equals("comment not deleted", comment.deletedAt, null);
  // 7. Verify article details include valid author and section info
  TestValidator.notEquals("article has valid id", article.id, undefined);
  TestValidator.notEquals("article title exists", article.title, undefined);
  TestValidator.notEquals("article content exists", article.content, undefined);
  TestValidator.equals("article section id", article.section.id, section.id);
  TestValidator.equals(
    "article author id",
    article.author.userId,
    memberAuth.id,
  );
  // 8. Verify comment id is unique valid UUID
  typia.assert(comment.id);
  TestValidator.predicate(
    "comment id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      comment.id,
    ),
  );
}
