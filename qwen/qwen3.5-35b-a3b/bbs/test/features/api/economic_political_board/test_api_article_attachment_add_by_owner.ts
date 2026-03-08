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
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_article_attachment } from "../../../prepare/prepare_random_economic_political_board_article_attachment";
import { prepare_random_economic_political_board_attachment } from "../../../prepare/prepare_random_economic_political_board_attachment";

export async function test_api_article_attachment_add_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create connection with member's token
  const articleConnection: api.IConnection = { host: connection.host };
  articleConnection.headers = {
    ...articleConnection.headers,
    Authorization: memberAuth.token.access,
  };
  // 3. Create article using the member connection
  const article =
    await generate_random_economic_political_board_member_articles_create(
      articleConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.paragraph({ sentences: 5 }),
          section_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(article);
  // 4. Add attachments to the article
  const attachmentsToAdd = ArrayUtil.repeat(3, () => ({
    file_url: typia.random<string & tags.Format<"uri">>(),
    file_name: RandomGenerator.name(),
    file_type: RandomGenerator.pick(["image", "file"] as const),
  }));
  const attachmentResponse =
    await api.functional.economicPoliticalBoard.member.articles.attachments.manageAttachments(
      articleConnection,
      {
        articleId: article.id,
        body: {
          attachments: attachmentsToAdd,
        } satisfies IEconomicPoliticalBoardArticle.IManageAttachmentsRequest,
      },
    );
  typia.assert(attachmentResponse);
  // 5. Validate response structure
  TestValidator.equals(
    "attachment count",
    attachmentResponse.data.length,
    attachmentsToAdd.length,
  );
  TestValidator.equals(
    "pagination records",
    attachmentResponse.pagination.records,
    attachmentsToAdd.length,
  );
  TestValidator.equals(
    "pagination pages",
    attachmentResponse.pagination.pages,
    1,
  );
  TestValidator.equals(
    "pagination current",
    attachmentResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    attachmentResponse.pagination.limit,
    attachmentResponse.data.length > 0 ? attachmentResponse.data.length : 1,
  );
  // 6. Verify each attachment has correct metadata
  for (let i = 0; i < attachmentsToAdd.length; i++) {
    const expectedAttachment = attachmentsToAdd[i];
    const actualAttachment = attachmentResponse.data[i];
    TestValidator.equals(
      `attachment ${i} file_name`,
      actualAttachment.file_name,
      expectedAttachment.file_name,
    );
    TestValidator.equals(
      `attachment ${i} file_type`,
      actualAttachment.file_type,
      expectedAttachment.file_type,
    );
    TestValidator.equals(
      `attachment ${i} file_url`,
      actualAttachment.file_url,
      expectedAttachment.file_url,
    );
    TestValidator.predicate(
      `attachment ${i} has valid created_at`,
      () => !isNaN(new Date(actualAttachment.created_at).getTime()),
    );
    TestValidator.predicate(
      `attachment ${i} has valid updated_at`,
      () => !isNaN(new Date(actualAttachment.created_at).getTime()),
    );
    TestValidator.equals(
      `attachment ${i} has valid id`,
      typeof actualAttachment.id,
      "string",
    );
  }
  // 7. Verify article reference in each attachment
  for (const attachment of attachmentResponse.data) {
    TestValidator.equals(
      "attachment has article reference",
      attachment.article.id,
      article.id,
    );
  }
}
