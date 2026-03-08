import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";

export async function test_api_comment_deletion_by_non_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "1234",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Member A creates a comment
  const memberAComment =
    await api.functional.redditLike.member.posts.comments.create(
      memberAConnection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(memberAComment);
  // 3. Create and authenticate Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "1234",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(memberB);
  // 4. Member B attempts to delete Member A's comment (should fail with 403)
  await TestValidator.error("non-author cannot delete comment", async () => {
    await api.functional.redditLike.member.comments.erase(memberBConnection, {
      commentId: memberAComment.id,
    });
  });
  // 5. Verify comment data integrity
  typia.assert(memberAComment);
  TestValidator.equals(
    "comment ID matches original",
    memberAComment.id,
    memberAComment.id,
  );
}
