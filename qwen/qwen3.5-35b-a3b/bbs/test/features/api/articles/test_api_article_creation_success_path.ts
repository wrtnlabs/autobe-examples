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

export async function test_api_article_creation_success_path(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Create member connection with authorization token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: joinConnection.headers,
  };
  // 3. Create article using utility function
  const article =
    await generate_random_economic_political_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 5,
          }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          section_id: typia.random<string & tags.Format<"uuid">>(),
          tagIds: ArrayUtil.repeat(3, () =>
            typia.random<string & tags.Format<"uuid">>(),
          ),
          attachmentData: [
            {
              file_url: typia.random<string & tags.Format<"uri">>(),
              file_name: "document.pdf",
              file_type: "file",
            },
            {
              file_url: typia.random<string & tags.Format<"uri">>(),
              file_name: "image.png",
              file_type: "image",
            },
          ],
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 4. Validate article response structure
  TestValidator.equals("article ID is UUID", article.id, article.id);
  TestValidator.predicate(
    "article has valid title",
    article.title.length > 0 && article.title.length <= 500,
  );
  TestValidator.predicate(
    "article has valid content",
    article.content.length > 0 && article.content.length <= 50000,
  );
  typia.assert(article.author);
  TestValidator.predicate(
    "author has display name",
    article.author.user.displayName.length > 0,
  );
  typia.assert(article.section);
  TestValidator.predicate("section has name", article.section.name.length > 0);
  typia.assert(article.attachments);
  TestValidator.equals(
    "attachments count matches input",
    article.attachments.length,
    2,
  );
  TestValidator.equals("tags count matches input", article.tags.length, 3);
  TestValidator.equals("article is active", article.deleted_at, null);
  TestValidator.predicate(
    "created_at is valid datetime",
    !Number.isNaN(Date.parse(article.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    !Number.isNaN(Date.parse(article.updated_at)),
  );
  // 5. Validate attachment details
  typia.assert(article.attachments[0]);
  TestValidator.equals(
    "first attachment filename",
    article.attachments[0].file_name,
    "document.pdf",
  );
  TestValidator.equals(
    "second attachment filename",
    article.attachments[1].file_name,
    "image.png",
  );
}
