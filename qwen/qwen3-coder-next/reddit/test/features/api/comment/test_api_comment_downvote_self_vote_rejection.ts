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

export async function test_api_comment_downvote_self_vote_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and login
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditClone.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create comment using member's authenticated connection
  const comment = await api.functional.redditClone.member.comments.create(
    memberConnection,
    {
      body: {
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCloneContentComment.ICreate,
    },
  );
  typia.assert(comment);
  // 3. Attempt to downvote own comment (should be rejected)
  await TestValidator.error("self-vote downvote rejection", async () => {
    await api.functional.redditClone.member.comments.downvote(
      memberConnection,
      {
        commentId: comment.id,
        body: {
          voteType: "downvote" as const,
        } satisfies IRedditCloneContentPostVote.ICreate,
      },
    );
  });
}
