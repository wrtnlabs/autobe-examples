import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";

/**
 * Test that attempting to create a comment on a non-existent post returns a 404 error.
 *
 * This test validates that the system properly validates post existence before
 * allowing comment creation. When a member attempts to comment on a non-existent
 * post, the system should return a 404 HTTP error.
 */
export async function test_api_comment_post_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 2: Generate a non-existent post ID
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Attempt to create a comment on non-existent post
  // Step 4: Verify 404 error is returned
  await TestValidator.httpError(
    "should return 404 when creating comment on non-existent post",
    404,
    async () => {
      await api.functional.communityPlatform.member.posts.comments.create(
        memberConnection,
        {
          postId: nonExistentPostId,
          body: {
            content: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    },
  );
}
