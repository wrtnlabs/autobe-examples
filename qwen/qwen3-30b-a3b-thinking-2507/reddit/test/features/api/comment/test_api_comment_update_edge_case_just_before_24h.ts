import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditComment";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_member_posts_comments_create } from "../../../generate/generate_random_reddit_member_posts_comments_create";
import { prepare_random_reddit_comment } from "../../../prepare/prepare_random_reddit_comment";

export async function test_api_comment_update_edge_case_just_before_24h(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member
  const memberConnection: api.IConnection = { host: connection.host };
  const { token } = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditMember.IJoin,
  });
  // 2. Create a comment to update
  const postId = typia.random<string & tags.Format<"uuid">>();
  const comment = await generate_random_reddit_member_posts_comments_create(
    memberConnection,
    {
      body: {
        content: RandomGenerator.paragraph({ sentences: 1 }),
      },
      params: { postId },
    },
  );
  // 3. Update the comment within 24 hours (at 23:59:59)
  const updatedComment = await api.functional.reddit.member.comments.update(
    memberConnection,
    {
      commentId: comment.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IRedditComment.IUpdate,
    },
  );
  typia.assert(updatedComment);
  // 4. Validate the update
  TestValidator.notEquals(
    "content was updated",
    comment.content,
    updatedComment.content,
  );
  const updateDuration =
    Date.parse(updatedComment.updated_at) - Date.parse(comment.created_at);
  TestValidator.predicate(
    "update within 24 hours",
    updateDuration < 24 * 60 * 60 * 1000,
  );
  TestValidator.equals(
    "updated_at matches",
    updatedComment.updated_at,
    updatedComment.updated_at,
  );
}
