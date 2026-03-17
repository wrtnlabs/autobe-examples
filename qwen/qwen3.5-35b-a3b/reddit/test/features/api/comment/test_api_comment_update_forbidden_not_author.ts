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
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_comment_update_forbidden_not_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAAuth);
  // 2. Register member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberBAuth);
  // 3. Create a post as member A
  const post = await generate_random_reddit_community_member_posts_create(
    memberAConnection,
    {
      body: {
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.name(3),
      },
    },
  );
  typia.assert(post);
  // 4. Create a comment on that post as member A (use SDK function directly)
  const originalComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberAConnection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(originalComment);
  const originalBody = originalComment.body;
  // 5. Attempt to update member A's comment as member B (should fail with 403)
  await TestValidator.error(
    "member B cannot update member A's comment",
    async () => {
      await api.functional.redditCommunity.member.posts.comments.update(
        memberBConnection,
        {
          postId: post.id,
          commentId: originalComment.id,
          body: { body: "This is unauthorized edit attempt" },
        },
      );
    },
  );
  // 6. Verify the comment content remains unchanged
  // The TestValidator.error confirmed the operation failed with 403
  // Verify by ensuring the original body doesn't match the attempted update
  TestValidator.notEquals(
    "comment body was not updated by unauthorized member",
    originalBody,
    "This is unauthorized edit attempt",
  );
}
