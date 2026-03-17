import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { prepare_random_reddit_like_attachment_access_log } from "../../../prepare/prepare_random_reddit_like_attachment_access_log";

export async function test_api_attachment_access_log_create_not_found(
  connection: api.IConnection,
) {
  // 1. Authenticate as member to obtain JWT tokens
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Use a random UUID as attachmentId that doesn't exist
  const nonExistentAttachmentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to create access log and verify 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent attachment",
    404,
    async () => {
      await api.functional.redditLike.member.attachments.access.createAccessLog(
        memberConnection,
        {
          attachmentId: nonExistentAttachmentId,
          body: {
            access_type: "view",
          } satisfies IRedditLikeAttachmentAccessLog.ICreate,
        },
      );
    },
  );
}
