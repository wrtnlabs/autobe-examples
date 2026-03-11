import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_attachment } from "../../../prepare/prepare_random_economic_political_board_attachment";

export async function test_api_article_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create article with full metadata
  const originalTitle = "Original Title";
  const originalContent = "Original content with detailed text...";
  const originalTags = ["tag1", "tag2", "tag3"];
  const originalAttachments: IEconomicPoliticalBoardAttachment.ICreate[] = [
    {
      file_url: "https://example.com/files/file1.pdf",
      file_name: "file1.pdf",
      file_type: "file" as const,
    },
  ];
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const createBody = {
    title: originalTitle,
    content: originalContent,
    sectionId: sectionId,
    tags: originalTags,
    attachments: originalAttachments,
  } satisfies IEconomicPoliticalBoardArticle.ICreate;
  const createdArticle =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberConnection,
      { body: createBody },
    );
  typia.assert(createdArticle);
  const articleId = createdArticle.id;
  const originalCreatedAt = createdArticle.created_at;
  // 3. Update article with only title field (partial update)
  const updatedTitle = "Updated Title Only";
  const updateBody = {
    title: updatedTitle,
  } satisfies IEconomicPoliticalBoardArticle.IUpdate;
  const updatedArticle =
    await api.functional.economicPoliticalBoard.member.articles.update(
      memberConnection,
      { articleId: articleId, body: updateBody },
    );
  typia.assert(updatedArticle);
  // 4. Verify title was updated
  TestValidator.equals(
    "title should be updated",
    updatedArticle.title,
    updatedTitle,
  );
  // 5. Verify content was preserved
  TestValidator.equals(
    "content should remain unchanged",
    updatedArticle.content,
    originalContent,
  );
  // 6. Verify tags were preserved (compare by name)
  TestValidator.equals(
    "tags count should remain unchanged",
    updatedArticle.tags.length,
    originalTags.length,
  );
  for (let i = 0; i < originalTags.length; i++) {
    TestValidator.equals(
      `tag ${i} name should remain unchanged`,
      updatedArticle.tags[i]?.name,
      originalTags[i],
    );
  }
  // 7. Verify attachments were preserved (compare file properties)
  TestValidator.equals(
    "attachments count should remain unchanged",
    updatedArticle.attachments.length,
    originalAttachments.length,
  );
  for (let i = 0; i < originalAttachments.length; i++) {
    TestValidator.equals(
      `attachment ${i} fileUrl should remain unchanged`,
      updatedArticle.attachments[i]?.fileUrl,
      originalAttachments[i].file_url,
    );
    TestValidator.equals(
      `attachment ${i} fileName should remain unchanged`,
      updatedArticle.attachments[i]?.fileName,
      originalAttachments[i].file_name,
    );
    TestValidator.equals(
      `attachment ${i} fileType should remain unchanged`,
      updatedArticle.attachments[i]?.fileType,
      originalAttachments[i].file_type,
    );
  }
  // 8. Verify updated_at changed
  TestValidator.predicate(
    "updated_at should be more recent than created_at",
    updatedArticle.updated_at > originalCreatedAt,
  );
}
