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
import { generate_random_reddit_clone_member_comments_create } from "../../../generate/generate_random_reddit_clone_member_comments_create";
import { generate_random_reddit_clone_member_comments_replies_create } from "../../../generate/generate_random_reddit_clone_member_comments_replies_create";
import { prepare_random_reddit_clone_content_comment } from "../../../prepare/prepare_random_reddit_clone_content_comment";

export async function test_api_nested_comment_reply_invalid_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a post for commenting
  const post = await api.functional.redditClone.member.comments.create(
    memberConnection,
    {
      body: {
        postId: typia.random<string & tags.Format<"uuid">>(),
        content: "Test post content for comment reply",
      } satisfies IRedditCloneContentComment.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create a top-level comment on the post
  const parentComment = await api.functional.redditClone.member.comments.create(
    memberConnection,
    {
      body: {
        postId: post.id,
        content: "This is a parent comment",
      } satisfies IRedditCloneContentComment.ICreate,
    },
  );
  typia.assert(parentComment);
  // 4. Try to create a reply with invalid parent comment ID (non-existent UUID)
  const invalidParentId = "00000000-0000-0000-0000-000000000000";
  // The server should return 404 Not Found when trying to reply to non-existent comment
  await TestValidator.error(
    "should return 404 for invalid parent comment ID",
    async () => {
      await api.functional.redditClone.member.comments.replies.create(
        memberConnection,
        {
          parentId: invalidParentId,
          body: {
            content: "This should fail as parent doesn't exist",
          } satisfies IRedditCloneContentComment.ICreate,
        },
      );
    },
  );
}
