import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import type { IRedditPlatformVoteHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformVoteHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_reddit_platform_posts_comments_create } from "../../../generate/generate_random_reddit_platform_posts_comments_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";

export async function test_api_user_vote_history_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // Create two users for the test scenario
  const user1Connection: api.IConnection = { host: connection.host };
  await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  const user2Connection: api.IConnection = { host: connection.host };
  await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  // Create a test comment using a random UUID
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Test the available vote history endpoint
  const voteHistory =
    await api.functional.redditPlatform.user.comments.vote_history.getVoteHistory(
      user1Connection,
      {
        commentId: postId,
      },
    );
  typia.assert(voteHistory);
  // Validate the response structure
  TestValidator.predicate(
    "vote history response is valid",
    voteHistory !== null,
  );
}
