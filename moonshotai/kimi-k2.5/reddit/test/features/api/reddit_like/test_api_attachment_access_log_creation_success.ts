import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeAttachmentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentAccessLog";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_like_member_attachments_create } from "../../../generate/generate_random_reddit_like_member_attachments_create";
import { generate_random_reddit_like_owner_attachments_access_create_access_log } from "../../../generate/generate_random_reddit_like_owner_attachments_access_create_access_log";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";
import { prepare_random_reddit_like_attachment_access_log } from "../../../prepare/prepare_random_reddit_like_attachment_access_log";

/**
 * Test that owner successfully creates an access log for an existing attachment file.
 *
 * @setHeader owner.authorization Authorization
 * @setHeader member.authorization Authorization
 *
 * Steps:
 * 1. Owner joins (POST /redditLike/auth/owner/join)
 * 2. Member joins (POST /redditLike/auth/member/join)
 * 3. Member uploads attachment (POST /redditLike/member/attachments)
 * 4. Owner creates access log for the attachment (POST /redditLike/owner/attachments/{attachmentId}/access)
 *
 * Expected: Successfully creates an access log entry with actor_id and actor_type
 * extracted from JWT claims (owner), access_type set to 'view', and auto-extracted
 * metadata. Returns complete IRedditLikeAttachmentAccessLog.
 */
export async function test_api_attachment_access_log_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register as owner and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {});
  typia.assert(owner);
  // Step 2: Register as member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 3: Upload file attachment as member
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(attachment);
  // Step 4: Create access log as owner
  const accessLog =
    await generate_random_reddit_like_owner_attachments_access_create_access_log(
      ownerConnection,
      {
        params: { attachmentId: attachment.id },
        body: { access_type: "view" },
      },
    );
  typia.assert(accessLog);
  // Validate access log structure and relationships
  TestValidator.equals(
    "attachment ID matches",
    accessLog.redditLikeAttachmentId,
    attachment.id,
  );
  TestValidator.equals("access type is view", accessLog.accessType, "view");
  TestValidator.equals("actor ID matches owner", accessLog.actorId, owner.id);
  TestValidator.equals("actor type is owner", accessLog.actorType, "owner");
  TestValidator.predicate(
    "access log has valid timestamps",
    () =>
      new Date(accessLog.createdAt).getTime() > 0 &&
      new Date(accessLog.updatedAt).getTime() > 0,
  );
  TestValidator.equals(
    "access log is not soft deleted",
    accessLog.deletedAt,
    null,
  );
}
