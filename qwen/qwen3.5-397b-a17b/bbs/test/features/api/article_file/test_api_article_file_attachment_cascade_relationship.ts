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
import { generate_random_discussion_board_admin_articles_files_create } from "../../../generate/generate_random_discussion_board_admin_articles_files_create";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_file_attachment_cascade_relationship(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
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
  typia.assert(adminAuth);
  // 2. Create section for article organization
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {},
  );
  typia.assert(section);
  // 3. Member setup - register for article creation
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
  // 4. Create article with the section
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        sectionId: section.id,
      },
    },
  );
  typia.assert(article);
  // 5. Attach file to article (admin endpoint)
  const fileAttachment =
    await generate_random_discussion_board_admin_articles_files_create(
      adminConnection,
      {
        params: { articleId: article.id },
      },
    );
  typia.assert(fileAttachment);
  // 6. Verify file attachment relationship
  TestValidator.equals(
    "file attachment article ID matches",
    fileAttachment.article.id,
    article.id,
  );
  TestValidator.equals(
    "file attachment member ID matches uploader",
    fileAttachment.member.id,
    adminAuth.member.id,
  );
  TestValidator.predicate(
    "file has valid storage path",
    fileAttachment.path.length > 0,
  );
  TestValidator.predicate(
    "file has original name",
    fileAttachment.original_name.length > 0,
  );
  TestValidator.predicate(
    "file has MIME type",
    fileAttachment.mime_type.length > 0,
  );
  TestValidator.predicate("file has size", fileAttachment.size > 0);
  // 7. Verify article summary in file attachment
  TestValidator.equals(
    "article summary title matches",
    fileAttachment.article.title,
    article.title,
  );
  TestValidator.equals(
    "article summary author matches",
    fileAttachment.article.author.id,
    article.author.id,
  );
  // 8. Verify member summary in file attachment
  TestValidator.equals(
    "member summary display name matches",
    fileAttachment.member.display_name,
    adminAuth.member.display_name,
  );
  TestValidator.equals(
    "member summary status matches",
    fileAttachment.member.status,
    adminAuth.member.status,
  );
}
