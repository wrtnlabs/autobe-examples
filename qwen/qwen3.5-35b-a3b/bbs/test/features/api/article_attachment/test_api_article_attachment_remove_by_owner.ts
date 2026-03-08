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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
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
import { prepare_random_economic_political_board_article_attachment } from "../../../prepare/prepare_random_economic_political_board_article_attachment";
import { prepare_random_economic_political_board_attachment } from "../../../prepare/prepare_random_economic_political_board_attachment";

export async function test_api_article_attachment_remove_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IEconomicPoliticalBoardMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {},
    });
  typia.assert(member);
  // 2. Create an article
  const article: IEconomicPoliticalBoardArticle =
    await generate_random_economic_political_board_member_articles_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(article);
  // 3. Add two attachments to the article
  const attachment1: IEconomicPoliticalBoardAttachment =
    await generate_random_economic_political_board_member_articles_attachments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {},
      },
    );
  typia.assert(attachment1);
  const attachment2: IEconomicPoliticalBoardAttachment =
    await generate_random_economic_political_board_member_articles_attachments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {},
      },
    );
  typia.assert(attachment2);
  // 4. Remove one attachment using manageAttachments
  const removedAttachmentId: string & tags.Format<"uuid"> = attachment1.id;
  const response: IEconomicPoliticalBoardAttachment.IList =
    await api.functional.economicPoliticalBoard.member.articles.attachments.manageAttachments(
      memberConnection,
      {
        articleId: article.id,
        body: {
          attachmentIds: [removedAttachmentId],
        },
      },
    );
  typia.assert(response);
  // 5. Validate removed attachment is not in response
  const remainingAttachmentIds = response.data.map((a) => a.id);
  TestValidator.predicate(
    "removed attachment not in response",
    () => !remainingAttachmentIds.includes(removedAttachmentId),
  );
  // 6. Validate remaining attachment count
  TestValidator.equals("remaining attachment count", response.data.length, 1);
  // 7. Validate remaining attachment is the one that wasn't removed
  TestValidator.equals(
    "correct attachment remains",
    response.data[0].id,
    attachment2.id,
  );
}
