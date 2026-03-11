import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_comment_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a comment with member connection
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  const comment = await api.functional.redditPlatform.member.comments.create(
    memberConnection,
    {
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
        post_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  // 3. Store original values before update
  const originalContent = comment.content;
  const originalCreatedAt = comment.created_at;
  const originalUpdatedAt = comment.updated_at;
  const originalVoteScore = comment.vote_score;
  const originalPost = comment.post;
  const originalParent = comment.parent;
  // 4. Update the comment with new content
  const newContent = RandomGenerator.paragraph({ sentences: 3 });
  const updatedComment =
    await api.functional.redditPlatform.member.comments.update(
      memberConnection,
      {
        commentId: comment.id,
        body: {
          content: newContent,
        } satisfies IRedditPlatformComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 5. Validate update
  TestValidator.equals("content updated", updatedComment.content, newContent);
  TestValidator.notEquals(
    "updated_at changed",
    originalUpdatedAt,
    updatedComment.updated_at,
  );
  TestValidator.equals(
    "vote_score unchanged",
    updatedComment.vote_score,
    originalVoteScore,
  );
  TestValidator.equals("post unchanged", updatedComment.post, originalPost);
  TestValidator.equals(
    "parent unchanged",
    updatedComment.parent,
    originalParent,
  );
}
