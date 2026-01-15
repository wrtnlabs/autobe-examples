import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { generate_random_discussion_board_citizen_attachments_create } from "../../../generate/generate_random_discussion_board_citizen_attachments_create";
import { generate_random_discussion_board_citizen_articles_create } from "../../../generate/generate_random_discussion_board_citizen_articles_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_attachment_update_description_only(
  connection: api.IConnection,
): Promise<void> {
  // Store original credentials from join operations
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const citizenEmail = typia.random<string & tags.Format<"email">>();
  const citizenPassword = RandomGenerator.alphaNumeric(16);
  const citizenHref = typia.random<string & tags.Format<"uri">>();
  const citizenReferrer = typia.random<string & tags.Format<"uri">>();
  // Step 1: Create admin connection and authenticate as admin for moderator account creation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAccount: IAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IAdmin.IJoin,
    },
  );
  typia.assert(adminAccount);
  // Step 2: Create member connection and authenticate as citizen for content creation
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenAccount: IDiscussionBoardUser.IAuthorized =
    await authorize_member_join(citizenConnection, {
      body: {
        email: citizenEmail,
        password: citizenPassword,
        href: citizenHref,
        referrer: citizenReferrer,
      } satisfies IDiscussionBoardUser.IJoin,
    });
  typia.assert(citizenAccount);
  // Step 3: Re-authenticate citizen to access citizen privileges
  const citizenLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(citizenLoginConnection, {
    body: {
      email: citizenEmail,
      password: citizenPassword,
      href: citizenHref,
      referrer: citizenReferrer,
    } satisfies IDiscussionBoardUser.ILogin,
  });
  // Step 4: Create an article by citizen to associate with attachment
  const article: IDiscussionBoardArticle =
    await generate_random_discussion_board_citizen_articles_create(
      citizenLoginConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 5 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // Step 5: Create an attachment by citizen
  const attachment: IDiscussionBoardAttachment =
    await generate_random_discussion_board_citizen_attachments_create(
      citizenLoginConnection,
      {
        body: {
          name: "document.pdf",
          extension: "pdf",
          size: 102400,
          mimetype: "application/pdf",
          content_id: article.id,
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  // Store original values before update
  const originalFileUrl = attachment.file_url;
  const originalContentType = attachment.content_type;
  const originalFileSize = attachment.file_size;
  const originalObjectId = attachment.object_id;
  const originalUploadDate = attachment.upload_date;
  // Step 6: Authenticate as admin for moderation update
  const adminUpdateConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminUpdateConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAdmin.ILogin,
  });
  // Step 7: Update a property that exists in the IUpdate interface
  const updatedAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.moderator.attachments.update(
      adminUpdateConnection,
      {
        attachmentId: attachment.id,
        body: {
          description: "Updated attachment description",
        } satisfies IDiscussionBoardAttachment.IUpdate,
      },
    );
  typia.assert(updatedAttachment);
  // Step 8: Validate the business change - only description was modified (but not returned), other fields preserved
  TestValidator.equals(
    "file_url unchanged",
    updatedAttachment.file_url,
    originalFileUrl,
  );
  TestValidator.equals(
    "content_type unchanged",
    updatedAttachment.content_type,
    originalContentType,
  );
  TestValidator.equals(
    "file_size unchanged",
    updatedAttachment.file_size,
    originalFileSize,
  );
  TestValidator.equals(
    "object_id unchanged",
    updatedAttachment.object_id,
    originalObjectId,
  );
  TestValidator.predicate(
    "upload_date changed (updated_at)",
    () => updatedAttachment.upload_date !== originalUploadDate,
  );
}
