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
import { generate_random_economic_political_board_member_articles_comments_create } from "../../../generate/generate_random_economic_political_board_member_articles_comments_create";
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_article_attachment } from "../../../prepare/prepare_random_economic_political_board_article_attachment";
import { prepare_random_economic_political_board_comment } from "../../../prepare/prepare_random_economic_political_board_comment";

export async function test_api_admin_comment_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join with valid credentials
  const adminJoinPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
  >();
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminJoinPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Admin logs in
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginAuth = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminJoinPassword,
    },
  });
  typia.assert(adminLoginAuth);
  // 3. Admin creates article
  const article =
    await api.functional.economicPoliticalBoard.member.articles.create(
      adminLoginConnection,
      {
        body: {
          title: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<500>
          >(),
          content: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<50000>
          >(),
          section_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 4. Admin creates comment on article
  const comment =
    await api.functional.economicPoliticalBoard.member.articles.comments.create(
      adminLoginConnection,
      {
        articleId: article.id,
        body: {
          content: typia.random<string & tags.MinLength<1>>(),
        } satisfies IEconomicPoliticalBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. Admin deletes their own comment
  await api.functional.economicPoliticalBoard.admin.articles.comments.erase(
    adminLoginConnection,
    {
      articleId: article.id,
      commentId: comment.id,
    },
  );
}
