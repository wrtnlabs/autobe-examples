import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentDownload } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentDownload";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { generate_random_discussion_board_member_articles_attachments_create } from "../../../generate/generate_random_discussion_board_member_articles_attachments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";

export async function test_api_admin_monitoring_attachment_usage_with_attachments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 2. Create member account for article creation
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
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
  // 3. Create articles with various attachments
  const attachmentTypes = [
    { filetype: "pdf", mime_type: "application/pdf", size: 1024 },
    { filetype: "jpg", mime_type: "image/jpeg", size: 2048 },
    {
      filetype: "docx",
      mime_type:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 3072,
    },
    { filetype: "png", mime_type: "image/png", size: 4096 },
  ] as const;
  const createdAttachments: IDiscussionBoardAttachment[] = [];
  for (const attachmentType of attachmentTypes) {
    // Create article
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            body: RandomGenerator.paragraph({ sentences: 3 }),
            discussion_board_section_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(article);
    // Create attachment
    const attachment =
      await generate_random_discussion_board_member_articles_attachments_create(
        memberConnection,
        {
          body: {
            filename: `test.${attachmentType.filetype}`,
            filetype: attachmentType.filetype,
            mime_type: attachmentType.mime_type,
            size_bytes: attachmentType.size,
          } satisfies IDiscussionBoardAttachment.ICreate,
          params: { articleId: article.id },
        },
      );
    typia.assert(attachment);
    createdAttachments.push(attachment);
  }
  // 4. Call monitoring endpoint
  const monitoringData =
    await api.functional.discussionBoard.admin.monitoring.attachment_usage.at(
      adminConnection,
    );
  typia.assert(monitoringData);
  // 5. Validate the monitoring data structure
  // The endpoint returns IDiscussionBoardAttachmentDownload which represents a single download record
  // We can validate that the response contains the expected properties
  TestValidator.predicate(
    "monitoring data should contain attachment information",
    monitoringData.attachment !== undefined,
  );
  TestValidator.predicate(
    "monitoring data should contain download context",
    monitoringData.actor_type !== undefined && monitoringData.ip !== undefined,
  );
  // Since the monitoring endpoint returns a single download record rather than aggregate statistics,
  // we validate that the endpoint returns valid data structure without making assumptions about
  // specific aggregation properties that may not exist in the response
  TestValidator.equals(
    "attachment ID should be valid UUID",
    typeof monitoringData.attachment.id,
    "string",
  );
  TestValidator.predicate(
    "attachment filename should be present",
    monitoringData.attachment.filename.length > 0,
  );
}
