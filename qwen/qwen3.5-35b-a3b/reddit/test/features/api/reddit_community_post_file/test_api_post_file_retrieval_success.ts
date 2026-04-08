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

export async function test_api_post_file_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate a random community for the post
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create a text post with file attachment
  const postConnection: api.IConnection = { host: connection.host };
  const post = await api.functional.redditCommunity.member.posts.create(
    postConnection,
    {
      body: {
        title: "Test Post with Files",
        post_type: "text",
        text_content: "This is a test post with file attachments.",
        reddit_community_community_id: communityId,
        files: [
          {
            file_name: "test-image.png",
            file_type: "image/png",
            file_size: 1024,
            file_url: "https://example.com/test-image.png",
          } satisfies IRedditCommunityPostFile.ICreate,
        ],
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Generate a valid file ID for testing (note: in real scenario, this would come from post creation response)
  const fileId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 5. Retrieve the file using the API
  const file = await api.functional.redditCommunity.posts.files.at(connection, {
    postId: post.id,
    fileId,
  });
  typia.assert(file);
  // 6. Validate response contains all expected metadata
  TestValidator.equals("file id is valid UUID", file.id, fileId);
  TestValidator.equals(
    "file name matches original",
    file.file_name,
    "test-image.png",
  );
  TestValidator.equals(
    "file type is correct MIME",
    file.file_type,
    "image/png",
  );
  TestValidator.equals("file size is accurate bytes", file.file_size, 1024);
  TestValidator.equals(
    "file url is valid storage URL",
    file.file_url,
    "https://example.com/test-image.png",
  );
  // 7. Validate file is not soft-deleted (deleted_at is null)
  TestValidator.equals("file is not soft-deleted", file.deleted_at, null);
  // 8. Validate timestamp formats are ISO 8601
  const createdAt = new Date(file.created_at);
  const updatedAt = new Date(file.updated_at);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(updatedAt.getTime()),
  );
  // 9. Validate post reference object is included
  TestValidator.equals("post id reference matches", file.post.id, post.id);
  TestValidator.equals(
    "post title in reference matches",
    file.post.title,
    "Test Post with Files",
  );
  TestValidator.equals("post type matches", file.post.post_type, "text");
  TestValidator.equals(
    "post author username matches",
    file.post.author.username,
    member.username,
  );
  // 10. Validate content fields
  TestValidator.equals(
    "text content matches",
    file.post.text_content,
    "This is a test post with file attachments.",
  );
  TestValidator.equals("vote score initialized to 0", file.post.vote_score, 0);
  TestValidator.equals(
    "comment count initialized to 0",
    file.post.comment_count,
    0,
  );
  // 11. Validate timestamps are properly formatted ISO 8601
  const postCreated = new Date(file.post.created_at);
  const postUpdated = new Date(file.post.updated_at);
  const postDeleted = file.post.deleted_at;
  TestValidator.predicate(
    "post created_at is valid date",
    !isNaN(postCreated.getTime()),
  );
  TestValidator.predicate(
    "post updated_at is valid date",
    !isNaN(postUpdated.getTime()),
  );
  TestValidator.equals(
    "post deleted_at is null for active post",
    postDeleted,
    null,
  );
}
