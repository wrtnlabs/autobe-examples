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

export async function test_api_article_update_authorship_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth: IEconomicPoliticalBoardMember.IAuthorized =
    await api.functional.economicPoliticalBoard.auth.member.join(
      memberAConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          displayName: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 2 }),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEconomicPoliticalBoardMember.IJoin,
      },
    );
  typia.assert(memberAAuth);
  // 2. Get a section for article creation
  // Note: We need to get sections first, but there's no SDK function for it
  // We'll use a random UUID as placeholder (in real test, this would come from API)
  const mockSection: IEconomicPoliticalBoardSection.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 1 }),
    created_at: new Date().toISOString(),
    articleCount: 0,
  };
  // 3. Member A creates an article
  const memberAConnection2: api.IConnection = { host: connection.host };
  memberAConnection2.headers = {
    ...memberAConnection2.headers,
    Authorization: memberAAuth.token.access,
  };
  const article: IEconomicPoliticalBoardArticle =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberAConnection2,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.paragraph({ sentences: 5 }),
          section_id: mockSection.id,
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 4. Create and authenticate Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth: IEconomicPoliticalBoardMember.IAuthorized =
    await api.functional.economicPoliticalBoard.auth.member.join(
      memberBConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          displayName: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 2 }),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEconomicPoliticalBoardMember.IJoin,
      },
    );
  typia.assert(memberBAuth);
  // 5. Member B attempts to update Member A's article (should fail with 403)
  const memberBConnection2: api.IConnection = { host: connection.host };
  memberBConnection2.headers = {
    ...memberBConnection2.headers,
    Authorization: memberBAuth.token.access,
  };
  await TestValidator.error(
    "Member B should not be able to update Member A's article",
    async () => {
      await api.functional.economicPoliticalBoard.member.articles.update(
        memberBConnection2,
        {
          articleId: article.id,
          body: {
            title: "Updated by Member B",
          } satisfies IEconomicPoliticalBoardArticle.IUpdate,
        },
      );
    },
  );
}
