import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentDownload } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentDownload";
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
import { generate_random_discussion_board_member_articles_attachments_create } from "../../../generate/generate_random_discussion_board_member_articles_attachments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";

export async function test_api_superadmin_monitoring_attachment_usage_capacity_planning(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
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
  // 3. Create test article
  const article = await api.functional.discussionBoard.member.articles.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 4. Create attachments with different file types and sizes
  const attachmentTypes = [
    {
      filetype: "pdf",
      mime_type: "application/pdf",
      size: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<5000000>
      >(),
    },
    {
      filetype: "jpg",
      mime_type: "image/jpeg",
      size: typia.random<
        number &
          tags.Type<"int32"> &
          tags.Minimum<50000> &
          tags.Maximum<2000000>
      >(),
    },
    {
      filetype: "docx",
      mime_type:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: typia.random<
        number &
          tags.Type<"int32"> &
          tags.Minimum<5000> &
          tags.Maximum<10000000>
      >(),
    },
  ];
  const attachments: IDiscussionBoardAttachment[] = [];
  for (const typeInfo of attachmentTypes) {
    const attachment =
      await api.functional.discussionBoard.member.articles.attachments.create(
        memberConnection,
        {
          articleId: article.id,
          body: {
            filename: `test_file.${typeInfo.filetype}`,
            filetype: typeInfo.filetype,
            mime_type: typeInfo.mime_type,
            size_bytes: typeInfo.size,
          } satisfies IDiscussionBoardAttachment.ICreate,
        },
      );
    typia.assert(attachment);
    attachments.push(attachment);
  }
  // 5. Download attachments to generate download statistics
  for (const attachment of attachments) {
    await api.functional.discussionBoard.articles.attachments.download(
      memberConnection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
      },
    );
  }
  // 6. Retrieve attachment usage monitoring data
  const monitoringData =
    await api.functional.discussionBoard.superAdmin.monitoring.attachment_usage.at(
      superAdminConnection,
    );
  typia.assert(monitoringData);
  // 7. Validate monitoring data structure matches IDiscussionBoardAttachmentDownload
  TestValidator.predicate(
    "monitoring data has attachment field",
    monitoringData.attachment !== undefined,
  );
  TestValidator.predicate(
    "monitoring data has download timestamp",
    monitoringData.created_at !== undefined,
  );
  TestValidator.predicate(
    "monitoring data has actor type",
    monitoringData.actor_type !== undefined,
  );
  TestValidator.predicate(
    "monitoring data has IP address",
    monitoringData.ip !== undefined,
  );
  // 8. Validate attachment metadata in monitoring response
  TestValidator.predicate(
    "attachment has valid file size",
    monitoringData.attachment.size_bytes > 0,
  );
  TestValidator.predicate(
    "attachment has file type",
    monitoringData.attachment.filetype.length > 0,
  );
  TestValidator.predicate(
    "attachment has MIME type",
    monitoringData.attachment.mime_type.length > 0,
  );
  TestValidator.predicate(
    "attachment has filename",
    monitoringData.attachment.filename.length > 0,
  );
  // 9. Validate download tracking information
  TestValidator.predicate(
    "download has valid actor type",
    ["guest", "member", "admin", "super_admin"].includes(
      monitoringData.actor_type,
    ),
  );
  TestValidator.predicate(
    "download has valid IP format",
    /^\d+\.\d+\.\d+\.\d+$/.test(monitoringData.ip),
  );
  TestValidator.predicate(
    "download has user agent",
    monitoringData.user_agent.length > 0,
  );
  // 10. Test cache consistency by making immediate second request
  const secondMonitoringData =
    await api.functional.discussionBoard.superAdmin.monitoring.attachment_usage.at(
      superAdminConnection,
    );
  typia.assert(secondMonitoringData);
  // Validate that both responses contain valid monitoring data
  TestValidator.predicate(
    "first monitoring data valid",
    monitoringData.id !== undefined,
  );
  TestValidator.predicate(
    "second monitoring data valid",
    secondMonitoringData.id !== undefined,
  );
  // 11. Validate business logic for capacity planning insights
  // The endpoint returns individual download records, not aggregated statistics
  // Validate that the data structure supports tracking usage patterns
  TestValidator.predicate(
    "monitoring supports timestamp tracking",
    monitoringData.created_at !== undefined,
  );
  TestValidator.predicate(
    "monitoring supports file size tracking",
    monitoringData.attachment.size_bytes !== undefined,
  );
  TestValidator.predicate(
    "monitoring supports file type tracking",
    monitoringData.attachment.filetype !== undefined,
  );
}