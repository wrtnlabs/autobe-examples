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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_attachments_create } from "../../../generate/generate_random_reddit_like_member_attachments_create";
import { generate_random_reddit_like_moderator_attachments_access_create_access_log } from "../../../generate/generate_random_reddit_like_moderator_attachments_access_create_access_log";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";
import { prepare_random_reddit_like_attachment_access_log } from "../../../prepare/prepare_random_reddit_like_attachment_access_log";

/**
 * Test moderator retrieval of attachment access log entry.
 *
 * 1. Member authenticates and uploads attachment
 * 2. Moderator authenticates
 * 3. Moderator creates access log for the attachment
 * 4. Moderator retrieves the created access log
 * 5. Validate log fields contain expected values
 */
export async function test_api_attachment_access_log_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {});
  typia.assert(moderator);
  // 3. Member uploads attachment
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {},
    );
  typia.assert(attachment);
  // 4. Moderator creates access log entry for the attachment
  const accessLog =
    await generate_random_reddit_like_moderator_attachments_access_create_access_log(
      moderatorConnection,
      {
        params: {
          attachmentId: attachment.id,
        },
      },
    );
  typia.assert(accessLog);
  // 5. Moderator retrieves the specific access log entry
  const retrievedLog =
    await api.functional.redditLike.moderator.attachments.access_logs.at(
      moderatorConnection,
      {
        attachmentId: attachment.id,
        logId: accessLog.id,
      },
    );
  typia.assert(retrievedLog);
  // 6. Validate business logic
  TestValidator.equals(
    "redditLikeAttachmentId matches the attachment",
    retrievedLog.redditLikeAttachmentId,
    attachment.id,
  );
  TestValidator.equals(
    "log id matches the created access log",
    retrievedLog.id,
    accessLog.id,
  );
}
