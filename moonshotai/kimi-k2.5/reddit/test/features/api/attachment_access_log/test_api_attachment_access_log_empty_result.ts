import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeAttachmentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeAttachmentAccessLog";
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
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";

export async function test_api_attachment_access_log_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator connection and authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {});
  // 2. Create member connection and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 3. Member uploads an attachment (this attachment will have no access logs)
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {},
    );
  typia.assert(attachment);
  // 4. Moderator queries access logs for the attachment that was never accessed
  const accessLogs: IPageIRedditLikeAttachmentAccessLog.ISummary =
    await api.functional.redditLike.moderator.attachments.access_logs.index(
      moderatorConnection,
      {
        attachmentId: attachment.id,
        body: {
          limit: 10,
          page: 1,
        } satisfies IRedditLikeAttachmentAccessLog.IRequest,
      },
    );
  // 5. Validate response - should have empty data array and zero pagination
  typia.assert(accessLogs);
  // Verify empty data array
  if (accessLogs.data.length !== 0) {
    throw new Error(
      `Expected empty data array but got ${accessLogs.data.length} items`,
    );
  }
  // Verify pagination shows zero total records
  if (accessLogs.pagination.records !== 0) {
    throw new Error(
      `Expected pagination.records to be 0 but got ${accessLogs.pagination.records}`,
    );
  }
  if (accessLogs.pagination.pages !== 0) {
    throw new Error(
      `Expected pagination.pages to be 0 but got ${accessLogs.pagination.pages}`,
    );
  }
  // Current page should be 1 (first page) by default
  if (accessLogs.pagination.current !== 1) {
    throw new Error(
      `Expected pagination.current to be 1 but got ${accessLogs.pagination.current}`,
    );
  }
  // Limit should match the requested value
  if (accessLogs.pagination.limit !== 10) {
    throw new Error(
      `Expected pagination.limit to be 10 but got ${accessLogs.pagination.limit}`,
    );
  }
}
