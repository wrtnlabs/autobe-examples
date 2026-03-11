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

export async function test_api_moderator_comment_thread_with_deleted_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize as moderator
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
  // 2. Create a post for the comment thread
  const post = await api.functional.redditLike.moderator.comments.at(
    moderatorConnection,
    {
      commentId: "00000000-0000-0000-0000-000000000000",
    },
  );
  typia.assert(post);
  // 3. Create a main comment
  const mainComment = await api.functional.redditLike.moderator.comments.at(
    moderatorConnection,
    {
      commentId: "00000000-0000-0000-0000-000000000000",
    },
  );
  typia.assert(mainComment);
  // 4. Create replies to the main comment
  const reply1 = await api.functional.redditLike.moderator.comments.at(
    moderatorConnection,
    {
      commentId: "00000000-0000-0000-0000-000000000000",
    },
  );
  typia.assert(reply1);
  const reply2 = await api.functional.redditLike.moderator.comments.at(
    moderatorConnection,
    {
      commentId: "00000000-0000-0000-0000-000000000000",
    },
  );
  typia.assert(reply2);
  // 5. Delete reply2 by setting deleted_at timestamp
  await api.functional.redditLike.moderator.comments.at(moderatorConnection, {
    commentId: reply2.id,
  });
  // 6. Retrieve the comment thread as moderator
  const thread = await api.functional.redditLike.moderator.comments.at(
    moderatorConnection,
    {
      commentId: mainComment.id,
    },
  );
  typia.assert(thread);
  // 7. Validate the thread structure
  TestValidator.equals("main comment matches", thread.id, mainComment.id);
  TestValidator.equals(
    "author matches",
    thread.author.id,
    mainComment.author.id,
  );
  TestValidator.predicate("has replies", thread.replies.length > 0);
  // 8. Verify deleted reply is excluded from replies array
  const deletedReplies = thread.replies.filter(
    (r) => r.deleted_at !== null && r.deleted_at !== undefined,
  );
  TestValidator.equals(
    "no deleted replies in thread",
    deletedReplies.length,
    0,
  );
  TestValidator.predicate(
    "reply2 excluded from replies",
    !thread.replies.some((r) => r.id === reply2.id),
  );
}
