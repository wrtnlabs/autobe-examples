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
import { generate_random_discussion_board_member_articles_files_create } from "../../../generate/generate_random_discussion_board_member_articles_files_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test file attachment by article author.
 *
 * This test validates the primary success path where a member attaches
 * a file to their own article. The test verifies:
 * 1. Admin creates section for article categorization
 * 2. Member registers and authenticates
 * 3. Member creates article in the section
 * 4. Member attaches file to their article
 * 5. File attachment is properly created with all metadata
 * 6. File attachment is associated with correct article and member
 * 7. Timestamps are properly set
 * 8. deleted_at is null indicating active file attachment
 *
 * @param connection Base connection (never used directly)
 */
export async function test_api_article_file_attachment_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create section for article categorization
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
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    { body: {} },
  );
  typia.assert(section);
  // 2. Member setup - register and authenticate
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
  // 3. Member creates article in the section
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        sectionId: section.id,
      },
    },
  );
  typia.assert(article);
  // 4. Member attaches file to their article
  const fileAttachment =
    await generate_random_discussion_board_member_articles_files_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          name: typia.random<string & tags.Format<"uuid">>(),
          original_name: `${RandomGenerator.name()}.pdf`,
          mime_type: "application/pdf",
          size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<10000000>
          >(),
          path: `/files/${typia.random<string & tags.Format<"uuid">>()}.pdf`,
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(fileAttachment);
  // 5. Validate file attachment relationships and metadata
  TestValidator.equals(
    "file attached to correct article",
    fileAttachment.article.id,
    article.id,
  );
  TestValidator.equals(
    "file uploaded by correct member",
    fileAttachment.member.id,
    memberAuth.id,
  );
  TestValidator.predicate(
    "file has valid created_at timestamp",
    fileAttachment.created_at !== null,
  );
  TestValidator.predicate(
    "file has valid updated_at timestamp",
    fileAttachment.updated_at !== null,
  );
  TestValidator.predicate(
    "file is not deleted",
    fileAttachment.deleted_at === null,
  );
  TestValidator.equals(
    "file mime type matches",
    fileAttachment.mime_type,
    "application/pdf",
  );
  TestValidator.predicate("file size is positive", fileAttachment.size > 0);
}
