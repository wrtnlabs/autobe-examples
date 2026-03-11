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
 * Test MIME type validation when super admin updates attachment metadata.
 * Validate that only properly formatted MIME types are accepted while malformed ones are rejected.
 */
export async function test_api_article_attachment_update_mime_type_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and register member
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
  // Create super admin connection and register super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // Create article using member connection
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
  // Create initial attachment using super admin connection
  const attachment =
    await api.functional.discussionBoard.superAdmin.articles.attachments.create(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          filename: `test-file.pdf`,
          filetype: "pdf",
          mime_type: "application/pdf",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  // Test valid MIME type updates
  const validMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "text/plain",
  ] as const;
  for (const mimeType of validMimeTypes) {
    const updatedAttachment =
      await api.functional.discussionBoard.superAdmin.articles.attachments.update(
        superAdminConnection,
        {
          articleId: article.id,
          attachmentId: attachment.id,
          body: {
            mime_type: mimeType,
          } satisfies IDiscussionBoardAttachment.IUpdate,
        },
      );
    typia.assert(updatedAttachment);
    TestValidator.equals(
      "MIME type should be updated",
      updatedAttachment.mime_type,
      mimeType,
    );
  }
  // Test malformed MIME types that should fail
  const malformedMimeTypes = ["pdf", "image", "application/"] as const;
  for (const mimeType of malformedMimeTypes) {
    await TestValidator.error("malformed MIME type should fail", async () => {
      await api.functional.discussionBoard.superAdmin.articles.attachments.update(
        superAdminConnection,
        {
          articleId: article.id,
          attachmentId: attachment.id,
          body: {
            mime_type: mimeType,
          } satisfies IDiscussionBoardAttachment.IUpdate,
        },
      );
    });
  }
  // Test MIME type and filetype consistency
  const mimeTypeMapping = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    png: "image/png",
    txt: "text/plain",
  } as const;
  for (const [filetype, expectedMimeType] of Object.entries(mimeTypeMapping)) {
    const updatedAttachment =
      await api.functional.discussionBoard.superAdmin.articles.attachments.update(
        superAdminConnection,
        {
          articleId: article.id,
          attachmentId: attachment.id,
          body: {
            filetype: filetype,
            mime_type: expectedMimeType,
          } satisfies IDiscussionBoardAttachment.IUpdate,
        },
      );
    typia.assert(updatedAttachment);
    TestValidator.equals(
      "filetype should match",
      updatedAttachment.filetype,
      filetype,
    );
    TestValidator.equals(
      "MIME type should match filetype",
      updatedAttachment.mime_type,
      expectedMimeType,
    );
  }
  // Test that system preserves correct MIME type formatting
  const finalUpdate =
    await api.functional.discussionBoard.superAdmin.articles.attachments.update(
      superAdminConnection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
        body: {
          mime_type: "application/json",
        } satisfies IDiscussionBoardAttachment.IUpdate,
      },
    );
  typia.assert(finalUpdate);
  TestValidator.predicate(
    "MIME type should be properly formatted",
    /^[a-z]+\/[a-z+-]+$/.test(finalUpdate.mime_type),
  );
}
