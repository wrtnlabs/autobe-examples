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

export async function test_api_attachment_access_log_cross_attachment_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup moderator authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
  } satisfies IRedditLikeModerator.IJoin;
  await authorize_moderator_join(moderatorConnection, {
    body: moderatorJoinInput,
  });
  // 2. Setup member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    password: typia.random<string & tags.MinLength<8> & tags.Format<"password">>(),
  } satisfies IRedditLikeMember.IJoin;
  await authorize_member_join(memberConnection, { body: memberJoinInput });
  // 3. Member uploads first attachment (attachmentA)
  const attachmentA =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {},
    );
  typia.assert(attachmentA);
  // 4. Member uploads second attachment (attachmentB) - to use as wrong attachment ID
  const attachmentB =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {},
    );
  typia.assert(attachmentB);
  // 5. Moderator creates access log entry for attachmentA
  const accessLogBody = {
    access_type: "view",
  } satisfies IRedditLikeAttachmentAccessLog.ICreate;
  const accessLog =
    await generate_random_reddit_like_moderator_attachments_access_create_access_log(
      moderatorConnection,
      {
        body: accessLogBody,
        params: { attachmentId: attachmentA.id },
      },
    );
  typia.assert(accessLog);
  // 6. Verify the access log belongs to attachmentA
  TestValidator.equals(
    "access log belongs to attachmentA",
    accessLog.redditLikeAttachmentId,
    attachmentA.id,
  );
  // 7. Attempt to retrieve access log using wrong attachment ID (attachmentB) with correct logId
  // This should throw a 404 Not Found error
  await TestValidator.error(
    "cross-attachment access log retrieval should fail with 404",
    async () => {
      await api.functional.redditLike.moderator.attachments.access_logs.at(
        moderatorConnection,
        {
          attachmentId: attachmentB.id, // Wrong attachment ID
          logId: accessLog.id, // Correct log ID that belongs to attachmentA
        },
      );
    },
  );
}