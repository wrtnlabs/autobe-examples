import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_super_admin_articles_attachments_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_attachments_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";

/**
 * Test filename uniqueness constraint when super admin updates attachment metadata.
 *
 * This test validates that attachment filenames must be unique within the same article.
 * It creates multiple attachments within an article and attempts to rename one to
 * duplicate another's filename, expecting the system to reject the update.
 */
export async function test_api_article_attachment_update_filename_uniqueness(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create super admin account and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "admin123",
      },
    },
  );
  typia.assert(superAdminAuth);
  // 3. Create article by member using SDK directly (no utility function available)
  const article = await api.functional.discussionBoard.member.articles.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 4. Create first attachment with unique filename
  const attachment1 =
    await generate_random_discussion_board_super_admin_articles_attachments_create(
      superAdminConnection,
      {
        params: { articleId: article.id },
        body: {
          filename: "document.pdf",
          filetype: "pdf",
          mime_type: "application/pdf",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        },
      },
    );
  typia.assert(attachment1);
  // 5. Create second attachment with different filename
  const attachment2 =
    await generate_random_discussion_board_super_admin_articles_attachments_create(
      superAdminConnection,
      {
        params: { articleId: article.id },
        body: {
          filename: "image.jpg",
          filetype: "jpg",
          mime_type: "image/jpeg",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        },
      },
    );
  typia.assert(attachment2);
  // 6. Attempt to rename attachment2 to duplicate attachment1's filename
  await TestValidator.error("filename uniqueness violation", async () => {
    await api.functional.discussionBoard.superAdmin.articles.attachments.update(
      superAdminConnection,
      {
        articleId: article.id,
        attachmentId: attachment2.id,
        body: {
          filename: "document.pdf",
        } satisfies IDiscussionBoardAttachment.IUpdate,
      },
    );
  });
  // 7. Verify original filenames remain unchanged by updating to different names
  const updatedAttachment1 =
    await api.functional.discussionBoard.superAdmin.articles.attachments.update(
      superAdminConnection,
      {
        articleId: article.id,
        attachmentId: attachment1.id,
        body: {
          filename: "updated_document.pdf",
        } satisfies IDiscussionBoardAttachment.IUpdate,
      },
    );
  typia.assert(updatedAttachment1);
  const updatedAttachment2 =
    await api.functional.discussionBoard.superAdmin.articles.attachments.update(
      superAdminConnection,
      {
        articleId: article.id,
        attachmentId: attachment2.id,
        body: {
          filename: "updated_image.jpg",
        } satisfies IDiscussionBoardAttachment.IUpdate,
      },
    );
  typia.assert(updatedAttachment2);
}
