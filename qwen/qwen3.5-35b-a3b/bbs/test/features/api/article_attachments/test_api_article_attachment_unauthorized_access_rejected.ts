import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import type { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardAttachment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_economic_political_board_member_articles_attachments_create } from "../../../generate/generate_random_economic_political_board_member_articles_attachments_create";
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_attachment } from "../../../prepare/prepare_random_economic_political_board_attachment";

export async function test_api_article_attachment_unauthorized_access_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create MemberA account and authenticate
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random < (string & tags.Format<"uri">) > (),
    },
  });
  typia.assert(memberAAuth);
  // 2. Create MemberB account and authenticate (separate user)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random < (string & tags.Format<"uri">) > (),
    },
  });
  typia.assert(memberBAuth);
  // 3. MemberA creates an article (use placeholder section ID)
  const article =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberAConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          sectionId: "00000000-0000-0000-0000-000000000000",
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 4. MemberA adds an attachment to their own article (should succeed)
  const attachment =
    await api.functional.economicPoliticalBoard.member.articles.attachments.create(
      memberAConnection,
      {
        articleId: article.id,
        body: {
          file_url: typia.random<string & tags.Format<"uri">>(),
          file_name: "test_document.pdf",
          file_type: "file",
        } satisfies IEconomicPoliticalBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  // 5. MemberB attempts to add an attachment to MemberA's article (should fail with 403)
  await TestValidator.httpError(
    "non-author should be denied attachment creation",
    [403],
    async () => {
      await api.functional.economicPoliticalBoard.member.articles.attachments.create(
        memberBConnection,
        {
          articleId: article.id,
          body: {
            file_url: typia.random < (string & tags.Format<"uri">) > (),
            file_name: "unauthorized_document.pdf",
            file_type: "file",
          } satisfies IEconomicPoliticalBoardAttachment.ICreate,
        },
      );
    },
  );
  // 6. Verify MemberA's attachment remains intact
  TestValidator.equals(
    "attachment file name unchanged",
    attachment.file_name,
    "test_document.pdf",
  );
  TestValidator.equals(
    "attachment file type unchanged",
    attachment.file_type,
    "file",
  );
}