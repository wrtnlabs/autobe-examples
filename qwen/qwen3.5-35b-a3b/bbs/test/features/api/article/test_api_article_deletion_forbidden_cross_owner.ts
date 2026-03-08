import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticleAttachment";
import type { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
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
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_article_attachment } from "../../../prepare/prepare_random_economic_political_board_article_attachment";

export async function test_api_article_deletion_forbidden_cross_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member (article owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerResult = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(ownerResult);
  // 2. Create a random section UUID for article creation
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Member A (owner) creates an article
  const article =
    await api.functional.economicPoliticalBoard.member.articles.create(
      ownerConnection,
      {
        body: {
          title: RandomGenerator.name(),
          content: RandomGenerator.content({ paragraphs: 1 }),
          section_id: sectionId,
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 4. Create second member (attempting deleter)
  const deleterConnection: api.IConnection = { host: connection.host };
  const deleterResult = await authorize_member_join(deleterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(deleterResult);
  // 5. Member B (deleter) attempts to delete Member A's article (should fail with 403)
  await TestValidator.error("cross-owner deletion forbidden", async () => {
    await api.functional.economicPoliticalBoard.member.articles.erase(
      deleterConnection,
      {
        articleId: article.id,
      },
    );
  });
  // Test complete - verified that cross-owner deletion is forbidden
}
