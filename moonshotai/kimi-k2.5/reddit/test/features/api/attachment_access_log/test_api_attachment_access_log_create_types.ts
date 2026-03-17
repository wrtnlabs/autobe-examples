import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeAttachmentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentAccessLog";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_attachments_access_create_access_log } from "../../../generate/generate_random_reddit_like_member_attachments_access_create_access_log";
import { generate_random_reddit_like_member_attachments_create } from "../../../generate/generate_random_reddit_like_member_attachments_create";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";
import { prepare_random_reddit_like_attachment_access_log } from "../../../prepare/prepare_random_reddit_like_attachment_access_log";

export async function test_api_attachment_access_log_create_types(
  connection: api.IConnection,
) {
  // Step 1: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Upload an attachment to have a valid attachmentId for logging access
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {},
    );
  typia.assert(attachment);
  // Step 3: Log 'download' access type
  const downloadLog =
    await generate_random_reddit_like_member_attachments_access_create_access_log(
      memberConnection,
      {
        params: { attachmentId: attachment.id },
        body: { access_type: "download" },
      },
    );
  typia.assert(downloadLog);
  // Step 4: Validate download access log
  TestValidator.equals(
    "download access type",
    downloadLog.accessType,
    "download",
  );
  TestValidator.equals(
    "attachment ID in download log",
    downloadLog.redditLikeAttachmentId,
    attachment.id,
  );
  TestValidator.predicate(
    "download log has valid actor ID",
    downloadLog.actorId !== null,
  );
  // Step 5: Log 'thumbnail_view' access type
  const thumbnailLog =
    await generate_random_reddit_like_member_attachments_access_create_access_log(
      memberConnection,
      {
        params: { attachmentId: attachment.id },
        body: { access_type: "thumbnail_view" },
      },
    );
  typia.assert(thumbnailLog);
  // Step 6: Validate thumbnail_view access log
  TestValidator.equals(
    "thumbnail_view access type",
    thumbnailLog.accessType,
    "thumbnail_view",
  );
  TestValidator.equals(
    "attachment ID in thumbnail log",
    thumbnailLog.redditLikeAttachmentId,
    attachment.id,
  );
  TestValidator.predicate(
    "thumbnail log has valid actor ID",
    thumbnailLog.actorId !== null,
  );
}
