import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_comments_replies_create } from "../../../generate/generate_random_reddit_clone_member_comments_replies_create";
import { prepare_random_reddit_clone_content_comment } from "../../../prepare/prepare_random_reddit_clone_content_comment";

export async function test_api_nested_comment_reply_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connections for testing
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Data = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member1Data);
  // 2. Create a post first to have a valid postId
  // Since we don't have a posts creation API in the available functions,
  // we'll use a placeholder postId based on the comment structure expectations
  // In a real scenario, this would be replaced with actual post creation
  const postId = "00000000-0000-0000-0000-000000000000";
  // 3. Create parent comment on a post (top-level comment)
  const parentComment =
    await api.functional.redditClone.member.comments.replies.create(
      member1Connection,
      {
        parentId: "00000000-0000-0000-0000-000000000000",
        body: {
          postId: postId,
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCloneContentComment.ICreate,
      },
    );
  typia.assert(parentComment);
  // 4. Create reply to the parent comment
  const reply = await api.functional.redditClone.member.comments.replies.create(
    member1Connection,
    {
      parentId: parentComment.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditCloneContentComment.ICreate,
    },
  );
  typia.assert(reply);
  // 5. Verify reply has expected fields
  TestValidator.equals(
    "reply has valid author",
    Boolean(reply.author.id),
    true,
  );
  TestValidator.equals(
    "reply has username",
    Boolean(reply.author.username),
    true,
  );
  TestValidator.equals("reply vote_score is 0", reply.voteScore, 0);
  TestValidator.equals("reply reply_count is 0", reply.replyCount, 0);
}
