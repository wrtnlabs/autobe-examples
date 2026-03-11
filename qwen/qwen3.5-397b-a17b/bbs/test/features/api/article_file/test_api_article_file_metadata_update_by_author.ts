import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
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
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_file_metadata_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator creates a section for article categorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const section = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 2. Member registers and authenticates via join flow
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Member creates an article with multiple file attachments in the section
  const article = await api.functional.discussionBoard.member.articles.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        sectionId: section.id,
        fileUrls: [
          typia.random<string & tags.Format<"uri">>(),
          typia.random<string & tags.Format<"uri">>(),
          typia.random<string & tags.Format<"uri">>(),
        ],
        imageUrls: [typia.random<string & tags.Format<"uri">>()],
        tags: ["test", "article", "files"],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Verify article has file attachments
  TestValidator.predicate("article has files", article.files.length > 0);
  // 4. Member updates file attachment metadata by changing the original_name
  const firstFile = article.files[0];
  const newOriginalName = `updated_${RandomGenerator.name()}.pdf`;
  const updatedFile =
    await api.functional.discussionBoard.articles.files.updateFiles(
      memberConnection,
      {
        articleId: article.id,
        body: {
          original_name: newOriginalName,
        } satisfies IDiscussionBoardArticleFile.IUpdate,
      },
    );
  typia.assert(updatedFile);
  // 5. Validate the updated original_name is reflected in the response
  TestValidator.equals(
    "original_name updated",
    updatedFile.original_name,
    newOriginalName,
  );
  // 6. Verify all other file metadata remains unchanged
  TestValidator.equals(
    "mime_type unchanged",
    updatedFile.mime_type,
    firstFile.mime_type,
  );
  TestValidator.equals("size unchanged", updatedFile.size, firstFile.size);
  TestValidator.equals("path unchanged", updatedFile.path, firstFile.path);
  TestValidator.equals("file id unchanged", updatedFile.id, firstFile.id);
  // 7. Verify updated_at timestamp is updated to reflect the modification
  TestValidator.predicate(
    "updated_at is newer",
    new Date(updatedFile.updated_at).getTime() >=
      new Date(firstFile.updated_at).getTime(),
  );
  // 8. Verify deleted_at remains null for active files
  TestValidator.equals("deleted_at is null", updatedFile.deleted_at, null);
  // 9. Verify the response structure includes all required fields
  TestValidator.predicate(
    "has article reference",
    updatedFile.article !== undefined,
  );
  TestValidator.predicate(
    "has member reference",
    updatedFile.member !== undefined,
  );
  TestValidator.predicate("has created_at", updatedFile.created_at !== null);
  TestValidator.predicate("has updated_at", updatedFile.updated_at !== null);
  // 10. Verify article reference matches the original article
  TestValidator.equals(
    "article id matches",
    updatedFile.article.id,
    article.id,
  );
  // 11. Verify member reference matches the authenticated member
  TestValidator.equals(
    "member id matches",
    updatedFile.member.id,
    memberAuth.id,
  );
}
