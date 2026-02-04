import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardAdmin";
import type { IEconPoliticBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardArticle";
import type { IEconPoliticBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_econ_politic_board_admin_articles_create } from "../../../generate/generate_random_econ_politic_board_admin_articles_create";
import { generate_random_econ_politic_board_admin_sections_create } from "../../../generate/generate_random_econ_politic_board_admin_sections_create";
import { prepare_random_econ_politic_board_article } from "../../../prepare/prepare_random_econ_politic_board_article";
import { prepare_random_econ_politic_board_section } from "../../../prepare/prepare_random_econ_politic_board_section";

export async function test_api_article_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, { body: {} });
  // Step 2: Create a section
  const section =
    await generate_random_econ_politic_board_admin_sections_create(
      adminConnection,
      {},
    );
  // Step 3: Create an article in the section
  const article =
    await generate_random_econ_politic_board_admin_articles_create(
      adminConnection,
      {
        body: { sectionId: section.id },
      },
    );
  // Force article to have 'id' property for compilation
  const articleWithId = typia.assert<{
    id: string;
  }>(article);
  const articleId = articleWithId.id;
  // Step 4: Delete the created article
  const deletedArticle =
    await api.functional.econPoliticBoard.admin.articles.erase(
      adminConnection,
      { articleId },
    );
  // Force deletedArticle to have 'id' property for compilation
  const deletedArticleWithId = typia.assert<{
    id: string;
  }>(deletedArticle);
  // Step 5: Verify deletion
  TestValidator.equals(
    "deleted article ID matches",
    deletedArticleWithId.id,
    articleId,
  );
}
