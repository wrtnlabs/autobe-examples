import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachmentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentAccessLog";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_like_owner_attachments_access_create_access_log } from "../../../generate/generate_random_reddit_like_owner_attachments_access_create_access_log";
import { prepare_random_reddit_like_attachment_access_log } from "../../../prepare/prepare_random_reddit_like_attachment_access_log";

export async function test_api_attachment_access_log_attachment_not_found(
  connection: api.IConnection,
) {
  // 1. Create actor-specific connection for owner
  const ownerConnection: api.IConnection = { host: connection.host };
  // 2. Register and authenticate as owner
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      nickname: RandomGenerator.name(),
    },
  });
  // 3. Generate random UUID for non-existent attachment
  const nonExistentAttachmentId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to log access for non-existent attachment and expect error
  await TestValidator.httpError(
    "should return 404 for non-existent attachment",
    404,
    async () => {
      await api.functional.redditLike.owner.attachments.access.createAccessLog(
        ownerConnection,
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
