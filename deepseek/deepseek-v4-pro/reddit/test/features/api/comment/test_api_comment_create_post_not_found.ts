import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_posts_comments_create } from "../../../generate/generate_random_community_hub_posts_comments_create";
import { prepare_random_community_hub_comment } from "../../../prepare/prepare_random_community_hub_comment";

/**
 * Test that creating a comment on a non-existent post returns 404.
 *
 * Validates that when an authenticated member attempts to create a top-level
 * comment on a post that does not exist, the server correctly rejects the
 * request with an HTTP 404 status code. The non-existent post is simulated by
 * generating a random UUID that does not correspond to any existing post in
 * the database.
 *
 * This test ensures the server performs proper post existence validation
 * before attempting to create a comment, preventing orphaned comments from
 * being created. No comment record should be persisted in the database as a
 * result of this request.
 *
 * 1. A new member joins the platform and obtains an authenticated session.
 * 2. A random UUID is generated to represent a non-existent post identifier.
 * 3. The member attempts to create a comment on the non-existent post.
 * 4. The request is rejected with HTTP 404, confirming the post-not-found
 *    validation works correctly.
 */
export async function test_api_comment_create_post_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate a random non-existent post UUID
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to create a comment on the non-existent post, expect 404
  await TestValidator.httpError(
    "create comment on non-existent post",
    404,
    async () => {
      await generate_random_community_hub_posts_comments_create(
        memberConnection,
        {
          params: { postId: nonExistentPostId },
        },
      );
    },
  );
}
