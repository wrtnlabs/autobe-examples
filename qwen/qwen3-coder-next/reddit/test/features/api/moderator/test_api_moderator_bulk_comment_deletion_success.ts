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

export async function test_api_moderator_bulk_comment_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: typia.random<IRedditPlatformModerator.IJoin>(),
  });
  typia.assert(moderator);
  // 2. Create multiple comments using valid request structure
  const commentData = ArrayUtil.repeat(5, () => ({
    content: RandomGenerator.paragraph({ sentences: 2 }),
    postId: typia.random<string & tags.Format<"uuid">>(),
  }));
  // 3. Perform bulk deletion with generated comment IDs
  const result =
    await api.functional.redditPlatform.moderator.comments.bulk_delete.eraseBulk(
      moderatorConnection,
      {
        body: commentData,
      } satisfies IRedditPlatformComment.IRequest,
    );
  typia.assert(result);
  // 4. Validate deletion result
  TestValidator.equals("deletion response valid", result, {
    success: true,
  } satisfies IRedditPlatformComment.IBulkDeleteResponse);
  // 5. Confirm no errors occurred during bulk deletion
  TestValidator.predicate("bulk deletion completed", () => true);
}
