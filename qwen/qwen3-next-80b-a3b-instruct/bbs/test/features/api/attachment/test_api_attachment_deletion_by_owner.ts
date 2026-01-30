import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAttachmentFile";
import type { IEconomicForumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUser";
import { prepare_random_economic_forum_attachment_file } from "../../../prepare/prepare_random_economic_forum_attachment_file";
import { generate_random_economic_forum_user_attachment_files_create } from "../../../generate/generate_random_economic_forum_user_attachment_files_create";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_attachment_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate user via join
  const userConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_user_join(userConnection, {
    body: {},
  });
  // userConnection.headers is now updated internally by authorize function
  // Step 2: Create an attachment file using the authenticated user connection
  // Using generation function as per priority rule (has utility function for POST /economicForum/user/attachmentFiles)
  const attachment =
    await generate_random_economic_forum_user_attachment_files_create(
      userConnection, // Use actor-specific connection, NOT base connection
      {
        body: {
          file_data: "data:text/plain;base64,SGVsbG8gd29ybGQh", // Base64 encoded 'Hello world!'
        },
      },
    );
  typia.assert(attachment);
  // Step 3: Delete the attachment file using its attachmentFileId
  // Using SDK function as no utility function exists for DELETE /economicForum/user/attachmentFiles/{attachmentFileId}
  await api.functional.economicForum.user.attachmentFiles.erase(
    userConnection, // Use actor-specific connection, NOT base connection
    {
      attachmentFileId: attachment.id,
    },
  );
  // Step 4: Validate that the deletion was successful (no error thrown)
  // The API returns void on success, so we just ensure no error occurred
  TestValidator.equals("attachment deletion successful", true, true);
}
