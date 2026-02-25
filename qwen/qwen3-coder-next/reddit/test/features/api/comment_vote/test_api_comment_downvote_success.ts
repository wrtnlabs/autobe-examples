import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import type { IRedditCloneContentPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPostVote";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_comments_create } from "../../../generate/generate_random_reddit_clone_member_comments_create";
import { generate_random_reddit_clone_member_comments_downvote } from "../../../generate/generate_random_reddit_clone_member_comments_downvote";
import { prepare_random_reddit_clone_content_comment } from "../../../prepare/prepare_random_reddit_clone_content_comment";
import { prepare_random_reddit_clone_content_post_vote } from "../../../prepare/prepare_random_reddit_clone_content_post_vote";

/**
 * Test comment downvote functionality.
 * 1. Register as author and create comment
 * 2. Register as voter and perform downvote
 * 3. Validate downvote record
 */
export async function test_api_comment_downvote_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as author and create comment
  const authorConnection: api.IConnection = { host: connection.host };
  const authorData = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.name(),
      displayName: null,
    },
  });
  typia.assert(authorData);
  // Create comment
  const commentData = await api.functional.redditClone.member.comments.create(
    authorConnection,
    {
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditCloneContentComment.ICreate,
    },
  );
  typia.assert(commentData);
  // Verify initial voteScore is 0
  TestValidator.equals(
    "initial comment voteScore is 0",
    commentData.voteScore,
    0,
  );
  // 2. Register as voter
  const voterConnection: api.IConnection = { host: connection.host };
  const voterData = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.name(),
      displayName: null,
    },
  });
  typia.assert(voterData);
  // 3. Execute downvote
  const voteData = await api.functional.redditClone.member.comments.downvote(
    voterConnection,
    {
      commentId: commentData.id,
      body: {
        voteType: "downvote" as const,
      } satisfies IRedditCloneContentPostVote.ICreate,
    },
  );
  typia.assert(voteData);
  // 4. Validate downvote result
  TestValidator.equals("downvote vote_value is -1", voteData.vote_value, -1);
  TestValidator.predicate(
    "vote has valid id",
    /^[0-9a-f-]{36}$/i.test(voteData.id),
  );
  TestValidator.predicate(
    "vote has valid created_at format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      voteData.created_at,
    ),
  );
}
