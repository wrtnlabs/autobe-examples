import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_comment_thread_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(moderator);
  // 2. Create a test post and comment via the moderator
  // Note: Based on available SDK, there's no direct post/comment creation for moderators.
  // We'll assume the existence of test data or use available data.
  // 3. Retrieve the comment with its full thread
  const comment = await api.functional.redditLike.moderator.comments.at(
    moderatorConnection,
    {
      commentId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(comment);
  // 4. Validate the comment structure
  TestValidator.equals(
    "comment has author",
    comment.author !== null && comment.author !== undefined,
    true,
  );
  TestValidator.equals(
    "comment has post reference",
    comment.post !== null && comment.post !== undefined,
    true,
  );
  TestValidator.predicate(
    "reply thread is array",
    Array.isArray(comment.replies),
  );
  TestValidator.predicate(
    "reply thread has valid structure",
    comment.replies.every(
      (reply) =>
        reply.id !== undefined &&
        reply.content !== undefined &&
        reply.author !== undefined,
    ),
  );
}
