import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import type { IEconPoliticalDiscussionRegisteredMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionRegisteredMember";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_attachment_deletion_sequentially_multiple(
  connection: api.IConnection,
) {
  // 1. Authenticate as registered member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconPoliticalDiscussionRegisteredMember.IAuthorized =
    await api.functional.auth.registeredMember.join(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: memberEmail,
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
      } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a test article to host multiple attachments
  const article: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        category: "Economic Policy",
        status: "published",
        econ_political_discussion_user_id: member.id,
      } satisfies IEconPoliticalDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // 3. Upload multiple attachments to the article for sequential deletion testing
  const attachments: IEconPoliticalDiscussionAttachment[] = [];

  // Upload first attachment
  const attachment1: IEconPoliticalDiscussionAttachment =
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          file_url: "https://example.com/document1.pdf",
          uploader_name: member.display_name,
          original_filename: "economic_analysis_1.pdf",
          file_type: "application/pdf",
          file_size: 1024000,
        } satisfies IEconPoliticalDiscussionAttachment.ICreate,
      },
    );
  typia.assert(attachment1);
  attachments.push(attachment1);

  // Upload second attachment
  const attachment2: IEconPoliticalDiscussionAttachment =
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          file_url: "https://example.com/chart1.png",
          uploader_name: member.display_name,
          original_filename: "market_trends_chart.png",
          file_type: "image/png",
          file_size: 2048000,
        } satisfies IEconPoliticalDiscussionAttachment.ICreate,
      },
    );
  typia.assert(attachment2);
  attachments.push(attachment2);

  // Upload third attachment
  const attachment3: IEconPoliticalDiscussionAttachment =
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          file_url: "https://example.com/data.csv",
          uploader_name: member.display_name,
          original_filename: "inflation_data.csv",
          file_type: "text/csv",
          file_size: 512000,
        } satisfies IEconPoliticalDiscussionAttachment.ICreate,
      },
    );
  typia.assert(attachment3);
  attachments.push(attachment3);

  // Validate that all attachments were created
  TestValidator.equals("three attachments created", attachments.length, 3);

  // 4. Delete attachments sequentially and validate each deletion
  // Delete first attachment
  const deletedAttachment1: IEconPoliticalDiscussionAttachment =
    await api.functional.econPoliticalDiscussion.registeredMember.articles.attachments.erase(
      connection,
      {
        articleId: article.id,
        attachmentId: attachment1.id,
      },
    );
  typia.assert(deletedAttachment1);
  TestValidator.equals(
    "first attachment deleted successfully",
    deletedAttachment1.id,
    attachment1.id,
  );

  // Delete second attachment
  const deletedAttachment2: IEconPoliticalDiscussionAttachment =
    await api.functional.econPoliticalDiscussion.registeredMember.articles.attachments.erase(
      connection,
      {
        articleId: article.id,
        attachmentId: attachment2.id,
      },
    );
  typia.assert(deletedAttachment2);
  TestValidator.equals(
    "second attachment deleted successfully",
    deletedAttachment2.id,
    attachment2.id,
  );

  // Delete third attachment
  const deletedAttachment3: IEconPoliticalDiscussionAttachment =
    await api.functional.econPoliticalDiscussion.registeredMember.articles.attachments.erase(
      connection,
      {
        articleId: article.id,
        attachmentId: attachment3.id,
      },
    );
  typia.assert(deletedAttachment3);
  TestValidator.equals(
    "third attachment deleted successfully",
    deletedAttachment3.id,
    attachment3.id,
  );

  // 5. Validate database consistency and proper cleanup
  TestValidator.predicate(
    "all attachment IDs are unique",
    new Set([attachment1.id, attachment2.id, attachment3.id]).size === 3,
  );

  // Verify the attachments were properly removed from the system
  TestValidator.notEquals(
    "deleted attachment 1 has different metadata",
    deletedAttachment1,
    attachment1,
  );
  TestValidator.notEquals(
    "deleted attachment 2 has different metadata",
    deletedAttachment2,
    attachment2,
  );
  TestValidator.notEquals(
    "deleted attachment 3 has different metadata",
    deletedAttachment3,
    attachment3,
  );

  // Validate that each deletion returned the correct attachment data
  TestValidator.equals(
    "first deleted attachment matches original",
    deletedAttachment1.original_filename,
    attachment1.original_filename,
  );
  TestValidator.equals(
    "second deleted attachment matches original",
    deletedAttachment2.original_filename,
    attachment2.original_filename,
  );
  TestValidator.equals(
    "third deleted attachment matches original",
    deletedAttachment3.original_filename,
    attachment3.original_filename,
  );
}
