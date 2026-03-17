import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeAttachmentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentAccessLog";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_moderator_attachments_access_create_access_log } from "../../../generate/generate_random_reddit_like_moderator_attachments_access_create_access_log";
import { prepare_random_reddit_like_attachment_access_log } from "../../../prepare/prepare_random_reddit_like_attachment_access_log";

/**
 * Test the error scenario where a moderator attempts to create an access log for a non-existent attachment.
 * The test verifies that the system returns an appropriate error response when the attachment ID does not exist.
 */
export async function test_api_moderator_attachment_access_log_attachment_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator-specific connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // 2. Authenticate as moderator using utility function
  await authorize_moderator_join(moderatorConnection, { body: {} });
  // 3. Generate a valid UUID that does not exist in the database
  const nonExistentAttachmentId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to create access log with non-existent attachment
  // This should throw an error indicating the attachment was not found
  await TestValidator.error("attachment not found error", async () => {
    await api.functional.redditLike.moderator.attachments.access.createAccessLog(
      moderatorConnection,
      {
        attachmentId: nonExistentAttachmentId,
        body: {
          access_type: "view",
        } satisfies IRedditLikeAttachmentAccessLog.ICreate,
      },
    );
  });
}
