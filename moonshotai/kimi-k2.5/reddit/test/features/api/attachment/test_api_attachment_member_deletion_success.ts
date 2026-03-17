import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_attachments_create } from "../../../generate/generate_random_reddit_like_member_attachments_create";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";

export async function test_api_attachment_member_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate as member using utility function
  await authorize_member_join(memberConnection, {});
  // 2. Upload attachment using utility function
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {},
    );
  // Validate attachment was created
  typia.assert(attachment);
  // 3. Delete the attachment using the captured attachmentId
  await api.functional.redditLike.member.attachments.erase(memberConnection, {
    attachmentId: attachment.id,
  });
  // Since erase returns void, successful completion indicates deletion success
  // No additional assertions needed as typia.validate would have been called on responses
}
