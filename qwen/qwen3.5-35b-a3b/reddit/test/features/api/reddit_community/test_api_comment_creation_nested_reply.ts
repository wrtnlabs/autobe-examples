import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";

export async function test_api_comment_creation_nested_reply(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration with unique credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinOutput);
  // 2. Create authenticated member connection with JWT token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: joinOutput.token.access },
  };
  // 3. Create post ID for the comment
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Create parent comment (top-level comment on post)
  const parentCommentBody = RandomGenerator.paragraph({ sentences: 2 });
  const parentComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      authenticatedConnection,
      {
        postId,
        body: {
          body: parentCommentBody,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(parentComment);
  typia.assert(parentComment);
  // 5. Create nested reply comment with parent_comment_id
  const replyBody = RandomGenerator.paragraph({ sentences: 1 });
  const replyComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      authenticatedConnection,
      {
        postId,
        body: {
          body: replyBody,
          parent_comment_id: parentComment.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(replyComment);
  // 6. Validate reply comment has correct properties
  TestValidator.equals("reply has correct body", replyComment.body, replyBody);
  TestValidator.equals("reply vote_score is 0", replyComment.vote_score, 0);
  TestValidator.equals(
    "parent_comment_id matches",
    replyComment.parent!.id,
    parentComment.id,
  );
  TestValidator.notEquals(
    "reply has parent (not null)",
    replyComment.parent,
    null,
  );
  // 7. Validate parent comment replyCount increased - use parent object from reply
  TestValidator.equals(
    "parent comment replyCount is 1",
    replyComment.parent!.replyCount,
    1,
  );
}