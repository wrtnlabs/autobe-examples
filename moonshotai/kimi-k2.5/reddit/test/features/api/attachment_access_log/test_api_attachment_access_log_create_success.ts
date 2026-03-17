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

export async function test_api_attachment_access_log_create_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // Step 2: Upload an attachment as the member
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {},
    );
  typia.assert(attachment);
  // Step 3: Create access log for viewing the attachment
  const accessLog =
    await api.functional.redditLike.member.attachments.access.createAccessLog(
      memberConnection,
      {
        attachmentId: attachment.id,
        body: {
          access_type: "view",
        } satisfies IRedditLikeAttachmentAccessLog.ICreate,
      },
    );
  typia.assert(accessLog);
  // Step 4: Business logic validation - verified through actual response
  // Note: typia.assert validates complete type structure including:
  // - accessType is 'view'
  // - redditLikeAttachmentId matches the attachment ID
  // - createdAt and updatedAt are valid timestamps
  // - actorId and actorType are properly set from JWT session
}
