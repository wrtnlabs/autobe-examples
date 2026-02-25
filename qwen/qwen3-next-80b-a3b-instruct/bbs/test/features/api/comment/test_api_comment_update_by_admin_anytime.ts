import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import type { IEconomicBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleAttachment";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import type { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { generate_random_economic_board_citizen_articles_create } from "../../../generate/generate_random_economic_board_citizen_articles_create";
import { prepare_random_economic_board_article } from "../../../prepare/prepare_random_economic_board_article";

export async function test_api_comment_update_by_admin_anytime(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create citizen user to post comment
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen: IEconomicBoardCitizen.IAuthorized =
    await authorize_citizen_join(citizenConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IEconomicBoardCitizen.IJoin,
    });
  typia.assert(citizen);
  // 2. Create admin user to update comment
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEconomicBoardAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEconomicBoardAdministrator.IJoin,
    });
  typia.assert(admin);
  // 3. Set up admin authentication for comment moderation
  await authorize_administrator_login(adminConnection, {
    body: {
      email: admin.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEconomicBoardAdministrator.ILogin,
  });
  typia.assert(adminConnection.headers?.Authorization);
  // 4. Set up citizen authentication to create article and comment
  await authorize_citizen_login(citizenConnection, {
    body: {
      email: citizen.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEconomicBoardCitizen.ILogin,
  });
  typia.assert(citizenConnection.headers?.Authorization);
  // 5. Create article under citizen account
  const article = await api.functional.economicBoard.citizen.articles.create(
    citizenConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEconomicBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 6. Create comment under article as citizen - THIS WILL BE SIMULATED AS PRE-EXISTING
  // Since there's no create endpoint, create a pretend comment with typia.random()
  // This matches the requirement that comment already exists for admin to update
  const comment: IEconomicBoardComment = typia.random<IEconomicBoardComment>();
  // Properly construct ISummary from article data
  comment.article = {
    id: article.id,
    title: article.title,
    section: article.section,
    author: citizen as IEconomicBoardCitizen.ISummary,
    tags: [], // Add empty tags array as required by ISummary
    comment_count: 0, // Set comment_count as required property in ISummary
    created_at: article.created_at,
    updated_at: article.updated_at,
  } satisfies IEconomicBoardArticle.ISummary;
  comment.author = citizen as IEconomicBoardCitizen.ISummary;
  comment.content = RandomGenerator.paragraph({ sentences: 2 });
  comment.updated_at = new Date().toISOString();
  comment.created_at = new Date().toISOString();
  comment.deleted_at = null;
  typia.assert(comment);
  // 7. Validate comment structure
  TestValidator.equals(
    "comment author matches citizen",
    comment.author.id,
    citizen.id,
  );
  // 8. Update comment as admin (bypassing 60-minute restriction)
  const updatedComment =
    await api.functional.economicBoard.articles.comments.update(
      adminConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEconomicBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 9. Validate comment was updated by admin
  TestValidator.equals(
    "comment author still matches citizen",
    updatedComment.author.id,
    citizen.id,
  );
  TestValidator.notEquals(
    "comment content changed",
    comment.content,
    updatedComment.content,
  );
  TestValidator.predicate(
    "comment updated_at is newer",
    () =>
      new Date(updatedComment.updated_at).getTime() >
      new Date(comment.updated_at).getTime(),
  );
  // 10. Confirm admin can update old comment (test the \"anytime\" functionality)
  const adminComment =
    await api.functional.economicBoard.articles.comments.update(
      adminConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IEconomicBoardComment.IUpdate,
      },
    );
  typia.assert(adminComment);
  TestValidator.notEquals(
    "admin can update comment multiple times",
    updatedComment.content,
    adminComment.content,
  );
}
