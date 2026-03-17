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
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_comment_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register member and create post
  const memberAuthConnection: api.IConnection = {
    host: connection.host,
  };
  const memberAuth = await authorize_member_join(memberAuthConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a post for the comment context using member connection
  const post = await api.functional.redditCommunity.member.posts.create(
    memberAuthConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text" as const,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Attempt to update a comment that doesn't exist
  // Use a valid UUID format that definitely doesn't exist in the database
  const nonExistentCommentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Verify the system returns 404 Not Found
  await TestValidator.error(
    "update non-existent comment should return 404",
    async () => {
      await api.functional.redditCommunity.member.posts.comments.update(
        memberAuthConnection,
        {
          postId: post.id,
          commentId: nonExistentCommentId,
          body: {
            body: "Updated comment text",
          } satisfies IRedditCommunityComment.IUpdate,
        },
      );
    },
  );
}
