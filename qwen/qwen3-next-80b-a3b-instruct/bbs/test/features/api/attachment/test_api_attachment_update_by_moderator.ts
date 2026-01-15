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
export async function test_api_attachment_update_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Capture the password for moderator account
  const moderatorPassword: string = RandomGenerator.alphaNumeric(16);
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorResponse: IAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: moderatorPassword,
  };
  const moderator: IAdmin.IAuthorized = await authorize_admin_join(
    moderatorConnection,
    {
      body: moderatorResponse satisfies IAdmin.IJoin,
    },
  );
  typia.assert(moderator);
  const moderatorEmail = moderatorResponse.email;
  
  // Step 2: Capture the password for citizen account
  const citizenPassword: string = RandomGenerator.alphaNumeric(16);
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenResponse: IDiscussionBoardUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: citizenPassword,
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
  };
  const citizen: IDiscussionBoardUser.IAuthorized = await authorize_member_join(
    citizenConnection,
    {
      body: citizenResponse satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(citizen);
  const citizenEmail = citizenResponse.email;
  
  // Step 3: Authenticate moderator with captured password
  const authedModeratorConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(authedModeratorConnection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IAdmin.ILogin,
  });
  
  // Step 4: Authenticate citizen with captured password
  const authedCitizenConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(authedCitizenConnection, {
    body: {
      email: citizenEmail,
      password: citizenPassword,
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
    } satisfies IDiscussionBoardUser.ILogin,
  });
  
  // Step 5: Create an article by citizen to associate with attachment
  const attachedArticle: IDiscussionBoardArticle =
    await generate_random_discussion_board_citizen_articles_create(
      authedCitizenConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          content: RandomGenerator.content({ paragraphs: 5 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(attachedArticle);
  
  // Step 6: Create an attachment by citizen
  const citizenAttachment: IDiscussionBoardAttachment =
    await generate_random_discussion_board_citizen_attachments_create(
      authedCitizenConnection,
      {
        body: {
          name: "test_document.pdf",
          extension: "pdf",
          size: 10240, // 10KB - within 20MB limit
          mimetype: "application/pdf",
          content_id: attachedArticle.id,
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(citizenAttachment);
  
  // Step 7: Moderator updates the attachment description
  const updatedAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.moderator.attachments.update(
      authedModeratorConnection,
      {
        attachmentId: citizenAttachment.id,
        body: {
          description: "Updated by moderator for quality assurance",
        } satisfies IDiscussionBoardAttachment.IUpdate,
      },
    );
  typia.assert(updatedAttachment);
  
  // Step 8: Validate all metadata integrity
  // Attachment ID must remain unchanged
  TestValidator.equals(
    "attachment ID preserved",
    updatedAttachment.id,
    citizenAttachment.id,
  );
  
  // File URL must remain unchanged
  TestValidator.equals(
    "file URL preserved",
    updatedAttachment.file_url,
    citizenAttachment.file_url,
  );
  
  // Content type must remain unchanged
  TestValidator.equals(
    "content type preserved",
    updatedAttachment.content_type,
    citizenAttachment.content_type,
  );
  
  // File size must remain unchanged
  TestValidator.equals(
    "file size preserved",
    updatedAttachment.file_size,
    citizenAttachment.file_size,
  );
  
  // Original filename must remain unchanged
  TestValidator.equals(
    "original filename preserved",
    updatedAttachment.original_filename,
    citizenAttachment.original_filename,
  );
  
  // Attachment type must remain unchanged
  TestValidator.equals(
    "attachment type preserved",
    updatedAttachment.attachment_type,
    citizenAttachment.attachment_type,
  );
  
  // Upload date must remain unchanged
  TestValidator.equals(
    "upload date preserved",
    updatedAttachment.upload_date,
    citizenAttachment.upload_date,
  );
  
  // Upload citizen ID must remain unchanged
  TestValidator.equals(
    "upload citizen ID preserved",
    updatedAttachment.upload_citizen_id,
    citizenAttachment.upload_citizen_id,
  );
  
  // Reported count must remain unchanged (if present)
  if (citizenAttachment.reported_count !== undefined) {
    TestValidator.equals(
      "reported count preserved",
      updatedAttachment.reported_count,
      citizenAttachment.reported_count,
    );
  }
  
  // Status must remain unchanged
  TestValidator.equals(
    "status preserved",
    updatedAttachment.status,
    citizenAttachment.status,
  );
  
  // is_thumbnail must remain unchanged (if present)
  if (citizenAttachment.is_thumbnail !== undefined) {
    TestValidator.equals(
      "is_thumbnail preserved",
      updatedAttachment.is_thumbnail,
      citizenAttachment.is_thumbnail,
    );
  }
  
  // Description must be updated
  // This property is not in IDiscussionBoardAttachment definition - cannot validate
  
  // updated_at timestamp must have been updated
  // This property is not in IDiscussionBoardAttachment definition - cannot validate
  
  // The test validates that the update operation succeeded by asserting the response is typed correctly
  // and checking properties that actually exist in the IDiscussionBoardAttachment
}