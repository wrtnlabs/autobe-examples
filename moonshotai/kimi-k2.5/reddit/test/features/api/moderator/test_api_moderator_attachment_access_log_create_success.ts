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

export async function test_api_moderator_attachment_access_log_create_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate to upload attachment
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: {} });
  // Upload attachment as member - use generation utility
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(attachment);
  // Step 2: Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, { body: {} });
  // Step 3: Create access log as moderator for view access type
  const accessLogBody = {
    access_type: "view",
  } satisfies IRedditLikeAttachmentAccessLog.ICreate;
  const accessLog =
    await api.functional.redditLike.moderator.attachments.access.createAccessLog(
      moderatorConnection,
      {
        attachmentId: attachment.id,
        body: accessLogBody,
      },
    );
  typia.assert(accessLog);
  // Step 4: Validate business logic
  TestValidator.equals(
    "attachment ID match",
    accessLog.redditLikeAttachmentId,
    attachment.id,
  );
  TestValidator.equals(
    "access type matches request",
    accessLog.accessType,
    "view",
  );
  TestValidator.predicate(
    "created_at is valid",
    new Date(accessLog.createdAt).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid",
    new Date(accessLog.updatedAt).getTime() > 0,
  );
  TestValidator.equals("deleted_at is null", accessLog.deletedAt, null);
  // Actor info should be populated from JWT (moderator)
  TestValidator.predicate(
    "actor_id is populated",
    accessLog.actorId !== null && accessLog.actorId !== undefined,
  );
  TestValidator.predicate(
    "actor_type is populated",
    accessLog.actorType !== null && accessLog.actorType !== undefined,
  );
}
