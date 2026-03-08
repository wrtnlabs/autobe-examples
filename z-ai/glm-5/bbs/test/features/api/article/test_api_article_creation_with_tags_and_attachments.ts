import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_attachment } from "../../../prepare/prepare_random_discussion_board_article_attachment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test article creation with tags and attachments.
 *
 * A member creates a comprehensive article with attachments:
 * - Article is created with valid title, content, and section_id
 * - Multiple attachments are processed - both file and image types
 * - Each attachment record includes metadata (type, name, extension, size)
 * - Response includes complete article with populated attachments array
 */
export async function test_api_article_creation_with_tags_and_attachments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create section prerequisite
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {},
  );
  typia.assert(section);
  // 2. Member setup - authenticate for article creation
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 3. Create article with attachments
  const article = await api.functional.discussionBoard.member.articles.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        section_id: section.id,
        attachments: [
          {
            type: "file",
            name: "research-paper.pdf",
            extension: "pdf",
            size: typia.random<
              number & tags.Type<"int32">
            >() satisfies number as number,
            url: typia.random<string & tags.Format<"uri">>(),
          } satisfies IDiscussionBoardArticleAttachment.ICreate,
          {
            type: "image",
            name: "diagram.png",
            extension: "png",
            size: typia.random<
              number & tags.Type<"int32">
            >() satisfies number as number,
            url: typia.random<string & tags.Format<"uri">>(),
          } satisfies IDiscussionBoardArticleAttachment.ICreate,
        ],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 4. Validate article properties
  TestValidator.equals("section matches", article.section.id, section.id);
  TestValidator.equals("author matches", article.author.id, member.id);
  TestValidator.predicate("has valid title", article.title.length > 0);
  TestValidator.predicate("has valid content", article.content.length >= 20);
  // 5. Validate attachments
  TestValidator.equals("has 2 attachments", article.attachments.length, 2);
  const fileAttachment = article.attachments.find((a) => a.type === "file");
  const imageAttachment = article.attachments.find((a) => a.type === "image");
  TestValidator.predicate(
    "file attachment exists",
    fileAttachment !== undefined,
  );
  TestValidator.predicate(
    "image attachment exists",
    imageAttachment !== undefined,
  );
  if (fileAttachment) {
    TestValidator.equals(
      "file extension is pdf",
      fileAttachment.extension,
      "pdf",
    );
    TestValidator.predicate("file has valid size", fileAttachment.size >= 0);
  }
  if (imageAttachment) {
    TestValidator.equals(
      "image extension is png",
      imageAttachment.extension,
      "png",
    );
    TestValidator.predicate("image has valid size", imageAttachment.size >= 0);
  }
  // 6. Validate tags array exists (may be empty since no tag creation API available)
  TestValidator.predicate("tags array exists", Array.isArray(article.tags));
}
