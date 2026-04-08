import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostFile";
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
 * Test successful retrieval of file attachments for an image post with multiple files.
 *
 * Validates the complete workflow of creating an image post with multiple file attachments
 * and retrieving those files through the paginated endpoint. Ensures that the file listing
 * API correctly returns all uploaded files with accurate metadata and pagination information.
 *
 * The test covers critical aspects including member authentication, post creation with file
 * attachments, and verification of file metadata consistency between upload and retrieval.
 * Special attention is given to pagination metadata accuracy and soft-delete handling.
 *
 * 1. Member authentication: Register a new member account using the utility function.
 * 2. Image post creation: Create an image post with 3 file attachments using the utility function.
 * 3. File retrieval: Call the target endpoint to retrieve all files for the created post.
 * 4. Pagination validation: Verify pagination metadata (records, pages, current) is accurate.
 * 5. File metadata validation: Ensure all file summaries contain required fields and values.
 * 6. Soft-delete verification: Confirm deleted_at is null for all active files.
 * 7. Post reference validation: Verify each file correctly references the parent post.
 */
export async function test_api_post_files_image_post_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account via utility function
  // Create new connection for member authentication from base connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create an image post with multiple file attachments via utility function
  // The utility handles authentication via the updated memberConnection
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Test Image Post with Multiple Files",
        post_type: "image",
        reddit_community_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        files: ArrayUtil.repeat(
          3,
          (index: number): {
            file_name: string;
            file_type: string;
            file_size: number & tags.Type<"uint32"> & tags.Minimum<1000>;
            file_url: string;
          } => ({
            file_name: `test_image_${index}.png`,
            file_type: "image/png",
            file_size: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >(),
            file_url: `/images/test_image_${index}.png`,
          }),
        ),
      },
    },
  );
  typia.assert(post);
  // 3. Call the target endpoint to retrieve files for the created post
  // Use base connection (files.index handles authentication via request headers)
  const filesResponse = await api.functional.redditCommunity.posts.files.index(
    connection,
    {
      postId: post.id,
      body: {},
    },
  );
  typia.assert(filesResponse);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination records count",
    filesResponse.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination pages count",
    filesResponse.pagination.pages,
    1,
  );
  TestValidator.equals(
    "pagination current page",
    filesResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    filesResponse.pagination.limit > 0,
  );
  // 5. Validate file data array contains exactly 3 files
  TestValidator.equals("files data array length", filesResponse.data.length, 3);
  // 6. Validate each file has correct metadata and required fields
  for (let i = 0; i < 3; i++) {
    const file = filesResponse.data[i];
    typia.assert(file);
    TestValidator.equals(
      `file ${i} has id`,
      file.id !== undefined && file.id !== null,
      true,
    );
    TestValidator.equals(
      `file ${i} has file_name`,
      file.file_name,
      `test_image_${i}.png`,
    );
    TestValidator.equals(
      `file ${i} has file_type`,
      file.file_type,
      "image/png",
    );
    TestValidator.predicate(
      `file ${i} file_size is positive`,
      file.file_size > 0,
    );
    TestValidator.equals(
      `file ${i} has file_url`,
      file.file_url !== undefined,
      true,
    );
    TestValidator.equals(
      `file ${i} has created_at`,
      file.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      `file ${i} has updated_at`,
      file.updated_at !== undefined,
      true,
    );
    TestValidator.equals(
      `file ${i} soft deleted_at is null`,
      file.deleted_at === null,
      true,
    );
    // Validate post reference
    TestValidator.equals(
      `file ${i} has post reference`,
      file.post !== undefined,
      true,
    );
    if (file.post !== undefined) {
      typia.assert(file.post);
      TestValidator.equals(`file ${i} post id matches`, file.post.id, post.id);
      TestValidator.equals(
        `file ${i} post title matches`,
        file.post.title,
        post.title,
      );
    }
  }
}
