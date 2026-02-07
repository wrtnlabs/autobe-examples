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

export async function test_api_moderator_bulk_comment_deletion_mixed_ids(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account for authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  // 2. Test bulk deletion with mixed valid and invalid comment IDs
  const validCommentId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentId = "00000000-0000-0000-0000-000000000000";
  // 3. Execute bulk delete with mixed IDs (valid, non-existent, etc.)
  const deleteResult =
    await api.functional.redditPlatform.moderator.comments.bulk_delete.eraseBulk(
      moderatorConnection,
      {
        body: {
          comment_ids: [
            validCommentId,
            nonExistentId,
            typia.random<string & tags.Format<"uuid">>(),
            nonExistentId,
            typia.random<string & tags.Format<"uuid">>(),
          ],
        },
      },
    );
  typia.assert(deleteResult);
  // 4. Validate response structure
  TestValidator.equals(
    "response has deleted_count",
    true,
    "deleted_count" in deleteResult,
  );
}
