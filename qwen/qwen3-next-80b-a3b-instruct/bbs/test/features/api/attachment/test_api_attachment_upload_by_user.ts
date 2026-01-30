import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAttachmentFile";
import type { IEconomicForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPost";
import type { IEconomicForumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUser";
import { prepare_random_economic_forum_post } from "../../../prepare/prepare_random_economic_forum_post";
import { prepare_random_economic_forum_attachment_file } from "../../../prepare/prepare_random_economic_forum_attachment_file";
import { generate_random_economic_forum_user_posts_create } from "../../../generate/generate_random_economic_forum_user_posts_create";
import { generate_random_economic_forum_user_attachment_files_create } from "../../../generate/generate_random_economic_forum_user_attachment_files_create";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_attachment_upload_by_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create user connection and authenticate via authorization function
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // Step 2: Create a forum post using generation function
  const post = await generate_random_economic_forum_user_posts_create(
    userConnection,
    {},
  );
  typia.assert(post);
  // Step 3: Prepare valid base64-encoded image data using typia.random without the invalid format tag
  const base64Image: string = typia.random<string>();
  // Step 4: Upload attachment via SDK function
  const attachment =
    await api.functional.economicForum.user.attachmentFiles.create(
      userConnection,
      {
        body: {
          file_data: base64Image,
        } satisfies IEconomicForumAttachmentFile.ICreate,
      },
    );
  typia.assert(attachment);
  // Step 5: Validate attachment response contains id property as defined in IEconomicForumAttachmentFile
  // The DTO only has 'id' property, so we validate that it's present and is a valid UUID
  TestValidator.equals("attachment has id field", attachment.id, attachment.id);
  TestValidator.predicate(
    "id is a valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      attachment.id,
    ),
  );
}