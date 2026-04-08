import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";

export async function test_api_comment_update_different_user_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member (comment author)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create a post for the comment (with valid community_id)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.redditPlatform.member.posts.create(
    memberAConnection,
    {
      body: {
        community_id: communityId,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create a comment by member A
  const originalComment =
    await api.functional.redditPlatform.member.comments.create(
      memberAConnection,
      {
        body: {
          reddit_platform_post_id: post.id,
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(originalComment);
  const originalUpdatedAt = originalComment.updated_at;
  const originalContent = originalComment.content;
  // 4. Create second member (attempting unauthorized edit)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberB);
  // 5. Attempt to update the comment with different user (should fail)
  await TestValidator.httpError(
    "should reject update by different user",
    [403],
    async () => {
      await api.functional.redditPlatform.member.comments.update(
        memberBConnection,
        {
          commentId: originalComment.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IRedditPlatformComment.IUpdate,
        },
      );
    },
  );
  // 6. Verify comment was not modified by checking original data
  TestValidator.equals(
    "content unchanged after unauthorized attempt",
    originalComment.content,
    originalContent,
  );
  TestValidator.equals(
    "updated_at timestamp unchanged",
    originalComment.updated_at,
    originalUpdatedAt,
  );
}