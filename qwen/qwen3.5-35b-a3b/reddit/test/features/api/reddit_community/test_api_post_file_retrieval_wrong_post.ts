import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
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
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";

/**
 * Test cross-reference validation when file belongs to different post.
 *
 * Validates the cross-reference validation behavior where a file's association
 * with its parent post is enforced at the API level. Ensures that attempting
 * to retrieve a file using an incorrect post ID (where the file does not belong)
 * returns a 404 Not Found error.
 *
 * The test follows a natural workflow:
 * 1. Creates a member account for authentication
 * 2. Creates two posts (Post A and Post B) with different file attachments
 * 3. Attempts to access a file using Post B's ID as the context
 * 4. Verifies the system correctly returns 404 for this cross-reference mismatch
 *
 * This validates the business rule that files are scoped to their parent post
 * and cannot be accessed through the wrong post context, ensuring proper
 * data isolation and security.
 */
export async function test_api_post_file_retrieval_wrong_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community for posts (use random UUID for test)
  const testCommunityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create Post A with file X
  const postA = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: "Post A Title",
        post_type: "image" as const,
        reddit_community_community_id: testCommunityId,
        files: [
          {
            file_name: "file_x.png",
            file_type: "image/png",
            file_size: 1024,
            file_url: "https://storage.example.com/file_x.png",
          } satisfies IRedditCommunityPostFile.ICreate,
        ],
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(postA);
  // 4. Create Post B with file Y
  const postB = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: "Post B Title",
        post_type: "image" as const,
        reddit_community_community_id: testCommunityId,
        files: [
          {
            file_name: "file_y.png",
            file_type: "image/png",
            file_size: 2048,
            file_url: "https://storage.example.com/file_y.png",
          } satisfies IRedditCommunityPostFile.ICreate,
        ],
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(postB);
  // 5. Attempt to access file with wrong post ID (file-post mismatch)
  // Generate a file ID - the API should return 404 because this file-post combination doesn't exist
  const fileId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "should return 404 when file does not belong to specified post",
    async () => {
      await api.functional.redditCommunity.posts.files.at(memberConnection, {
        postId: postB.id,
        fileId: fileId,
      });
    },
  );
}
