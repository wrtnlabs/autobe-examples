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

export async function test_api_admin_article_update_partial_metadata(
  connection: api.IConnection,
): Promise<void> {
  // Setup phase: Create member and admin users
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberName = RandomGenerator.name();
  const memberConnection: api.IConnection = { host: connection.host };
  const memberOutput = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      name: memberName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberOutput);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminDisplayName = RandomGenerator.name();
  const adminConnection: api.IConnection = { host: connection.host };
  const adminOutput = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      displayName: adminDisplayName,
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminOutput);
  // Member creates an article with all fields
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const initialArticle =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: "Initial Article Title",
          content: "This is the initial content of the article.",
          sectionId,
          tags: ["tag1", "tag2", "tag3"],
          attachments: [
            {
              file_url: "https://example.com/file1.pdf",
              file_name: "document1.pdf",
              file_type: "file",
            },
            {
              file_url: "https://example.com/image1.jpg",
              file_name: "photo1.jpg",
              file_type: "image",
            },
          ],
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(initialArticle);
  // Admin retrieves the article to capture initial state
  const adminRetrieveConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminRetrieveConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  const initialArticleDetail =
    await api.functional.economicPoliticalBoard.articles.at(
      adminRetrieveConnection,
      {
        articleId: initialArticle.id,
      },
    );
  typia.assert(initialArticleDetail);
  // Capture initial values for comparison
  const initialTitle = initialArticleDetail.title;
  const initialContent = initialArticleDetail.content;
  const initialTags = initialArticleDetail.tags.map((tag) => tag.name);
  const initialAttachments = initialArticleDetail.attachments.map((att) => ({
    fileUrl: att.fileUrl,
    fileName: att.fileName,
    fileType: att.fileType,
  }));
  const initialUpdatedAt = initialArticleDetail.updated_at;
  // Admin performs partial updates on the article
  const adminUpdateConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminUpdateConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  // Scenario A: Update only title
  const updatedArticleA =
    await api.functional.economicPoliticalBoard.admin.articles.update(
      adminUpdateConnection,
      {
        articleId: initialArticle.id,
        body: {
          title: "Updated Title Only",
        },
      },
    );
  typia.assert(updatedArticleA);
  TestValidator.equals(
    "title updated",
    updatedArticleA.title,
    "Updated Title Only",
  );
  TestValidator.equals(
    "content unchanged",
    updatedArticleA.content,
    initialContent,
  );
  TestValidator.equals(
    "tags unchanged",
    updatedArticleA.tags.map((t) => t.name),
    initialTags,
  );
  TestValidator.equals(
    "attachments unchanged",
    updatedArticleA.attachments.map((a) => ({
      fileUrl: a.fileUrl,
      fileName: a.fileName,
      fileType: a.fileType,
    })),
    initialAttachments,
  );
  TestValidator.predicate(
    "updatedAt timestamp updated",
    updatedArticleA.updated_at !== initialUpdatedAt,
  );
  // Capture state after title-only update for next scenario
  const updatedTitleOnly = {
    title: updatedArticleA.title,
    content: updatedArticleA.content,
    tags: updatedArticleA.tags.map((t) => t.name),
    attachments: updatedArticleA.attachments.map((a) => ({
      fileUrl: a.fileUrl,
      fileName: a.fileName,
      fileType: a.fileType,
    })),
    updatedAt: updatedArticleA.updated_at,
  };
  // Scenario B: Update only tags
  const updatedArticleB =
    await api.functional.economicPoliticalBoard.admin.articles.update(
      adminUpdateConnection,
      {
        articleId: initialArticle.id,
        body: {
          tags: ["newTag1", "newTag2"],
        },
      },
    );
  typia.assert(updatedArticleB);
  TestValidator.equals(
    "title unchanged",
    updatedArticleB.title,
    updatedTitleOnly.title,
  );
  TestValidator.equals(
    "content unchanged",
    updatedArticleB.content,
    updatedTitleOnly.content,
  );
  TestValidator.equals(
    "tags replaced",
    updatedArticleB.tags.map((t) => t.name),
    ["newTag1", "newTag2"],
  );
  TestValidator.equals(
    "attachments unchanged",
    updatedArticleB.attachments.map((a) => ({
      fileUrl: a.fileUrl,
      fileName: a.fileName,
      fileType: a.fileType,
    })),
    updatedTitleOnly.attachments,
  );
  // Scenario C: Update only attachments
  const updatedArticleC =
    await api.functional.economicPoliticalBoard.admin.articles.update(
      adminUpdateConnection,
      {
        articleId: initialArticle.id,
        body: {
          attachments: [
            {
              operations: [
                {
                  action: "add" as const,
                  attachment: {
                    file_url: "https://example.com/newfile.pdf",
                    file_name: "newdocument.pdf",
                    file_type: "file",
                  },
                },
              ],
            },
          ],
        },
      },
    );
  typia.assert(updatedArticleC);
  TestValidator.equals(
    "title unchanged",
    updatedArticleC.title,
    updatedTitleOnly.title,
  );
  TestValidator.equals(
    "content unchanged",
    updatedArticleC.content,
    updatedTitleOnly.content,
  );
  TestValidator.equals(
    "tags unchanged",
    updatedArticleC.tags.map((t) => t.name),
    updatedTitleOnly.tags,
  );
  TestValidator.equals(
    "attachments replaced",
    updatedArticleC.attachments.map((a) => ({
      fileUrl: a.fileUrl,
      fileName: a.fileName,
      fileType: a.fileType,
    })),
    [
      {
        fileUrl: "https://example.com/newfile.pdf",
        fileName: "newdocument.pdf",
        fileType: "file",
      },
    ],
  );
  // Scenario D: Update title and content only
  const updatedArticleD =
    await api.functional.economicPoliticalBoard.admin.articles.update(
      adminUpdateConnection,
      {
        articleId: initialArticle.id,
        body: {
          title: "Title and Content Updated",
          content: "This is the updated content.",
        },
      },
    );
  typia.assert(updatedArticleD);
  TestValidator.equals(
    "title updated",
    updatedArticleD.title,
    "Title and Content Updated",
  );
  TestValidator.equals(
    "content updated",
    updatedArticleD.content,
    "This is the updated content.",
  );
  TestValidator.equals(
    "tags unchanged",
    updatedArticleD.tags.map((t) => t.name),
    updatedTitleOnly.tags,
  );
  TestValidator.equals(
    "attachments unchanged",
    updatedArticleD.attachments.map((a) => ({
      fileUrl: a.fileUrl,
      fileName: a.fileName,
      fileType: a.fileType,
    })),
    updatedTitleOnly.attachments,
  );
}
