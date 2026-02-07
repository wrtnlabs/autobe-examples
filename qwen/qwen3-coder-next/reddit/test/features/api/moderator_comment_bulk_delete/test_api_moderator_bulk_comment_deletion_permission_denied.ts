import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_bulk_comment_deletion_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Register and authenticate moderator
  await authorize_moderator_join(moderatorConnection, {
    body: typia.random<IRedditPlatformModerator.IJoin>(),
  });
  // Generate valid comment IDs for the bulk delete operation
  const commentIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  // Attempt to delete comments - should fail due to lack of moderator privileges
  // The moderator doesn't have authority to delete comments in any community
  await TestValidator.error(
    "moderator bulk delete permission denied",
    async () => {
      await api.functional.redditPlatform.moderator.comments.bulk_delete.eraseBulk(
        moderatorConnection,
        {
          body: commentIds,
        },
      );
    },
  );
}
