import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_attachment } from "../../../prepare/prepare_random_economic_political_board_attachment";

export async function test_api_admin_article_update_cross_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member user Alice (article owner)
  const aliceConnection: api.IConnection = { host: connection.host };
  const aliceResult = await authorize_member_join(aliceConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(aliceResult);
  // 2. Register member user Bob (additional member)
  const bobConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(bobConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  // 3. Register admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminResult);
  // 4. Alice creates an article
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const aliceArticle =
    await api.functional.economicPoliticalBoard.member.articles.create(
      aliceConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          sectionId,
          tags: typia.random<string[] & tags.MaxItems<10>>(),
          attachments: typia.random<
            IEconomicPoliticalBoardAttachment.ICreate[] | undefined
          >(),
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(aliceArticle);
  // 5. Admin updates Alice's article (cross-author)
  const updatedArticle =
    await api.functional.economicPoliticalBoard.admin.articles.update(
      adminConnection,
      {
        articleId: aliceArticle.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          tags: typia.random<string[] | undefined>(),
          attachments: typia.random<
            IEconomicPoliticalBoardAttachment.IManage[] | undefined
          >(),
        } satisfies IEconomicPoliticalBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticle);
  // 6. Validate
  // - Admin successfully updated the article
  TestValidator.equals(
    "admin can update any article",
    updatedArticle.id,
    aliceArticle.id,
  );
  // - Article content is updated
  TestValidator.notEquals(
    "article title is updated",
    aliceArticle.title,
    updatedArticle.title,
  );
  // - Article's author remains the original owner (Alice)
  TestValidator.equals(
    "article author remains unchanged after admin update",
    updatedArticle.author.id,
    aliceResult.id,
  );
  // - Section remains intact
  TestValidator.equals(
    "article section remains unchanged after admin update",
    updatedArticle.section.id,
    sectionId,
  );
  // - Update timestamp changed
  TestValidator.notEquals(
    "updated_at timestamp changed after update",
    aliceArticle.updated_at,
    updatedArticle.updated_at,
  );
}
