import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_comment_vote_deletion_nonexistent_id(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate a user
  const userConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_user_join(userConnection, {
    body: typia.random<IRedditPlatformUser.IJoin>(),
  });
  typia.assert(auth);
  // Step 2: Attempt to delete a non-existent comment vote
  // Generate a random UUID that doesn't exist in the database
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Verify that deleting a non-existent vote throws a 404 error
  await TestValidator.error("non-existent vote ID returns 404", async () => {
    await api.functional.redditPlatform.user.comment_votes.erase(
      userConnection,
      { id: nonExistentId },
    );
  });
  // Step 4: Test with multiple different non-existent IDs for consistency
  const ids = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  for (const id of ids) {
    await TestValidator.error(
      `non-existent vote ID ${id} returns 404`,
      async () => {
        await api.functional.redditPlatform.user.comment_votes.erase(
          userConnection,
          { id },
        );
      },
    );
  }
}
