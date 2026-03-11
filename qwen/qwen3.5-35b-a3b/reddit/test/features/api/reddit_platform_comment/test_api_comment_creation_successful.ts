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

export async function test_api_comment_creation_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account using authorization utility
  const memberConnection: api.IConnection = { host: connection.host };
  const memberResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberResult);
  // 2. Create member-specific connection for API calls with token
  const memberApiConnection: api.IConnection = { host: connection.host };
  memberApiConnection.headers = {
    Authorization: `Bearer ${memberResult.token.access}`,
  };
  // 3. Generate test data for comment creation
  const testContent = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const testPostId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create comment using SDK function
  const comment = await api.functional.redditPlatform.member.comments.create(
    memberApiConnection,
    {
      body: {
        content: testContent,
        post_id: testPostId,
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  // 5. Validate comment creation
  TestValidator.equals(
    "comment vote_score initialized to 0",
    comment.vote_score,
    0,
  );
  TestValidator.equals(
    "comment author linked to authenticated member",
    comment.author.id,
    memberResult.user.id,
  );
  TestValidator.equals(
    "comment content stored exactly",
    comment.content,
    testContent,
  );
  TestValidator.predicate(
    "created_at timestamp is set",
    () => comment.created_at !== undefined && comment.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at timestamp is set",
    () => comment.updated_at !== undefined && comment.updated_at !== null,
  );
  TestValidator.equals(
    "comment post_id matches provided",
    comment.post?.id,
    testPostId,
  );
}
