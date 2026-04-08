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

export async function test_api_post_files_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // memberConnection.headers is now updated internally by authorize function
  // Use memberConnection for all subsequent API calls
  // 2. Generate 12 files with varying sizes and sequential timestamps
  const files: IRedditCommunityPostFile.ICreate[] = ArrayUtil.repeat(
    12,
    (index) => ({
      file_name: `image_${String(index + 1).padStart(2, "0")}.png`,
      file_type: "image/png",
      file_size: 1000 + index * 1000, // 1000, 2000, 3000, ..., 12000
      file_url: `https://storage.example.com/files/image_${index + 1}.png`,
    }),
  ) satisfies IRedditCommunityPostFile.ICreate[];
  // 3. Create an image post with 12 files
  // Note: In test environment, a valid community_id is required.
  // This may need a pre-existing community or simulation mode.
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: "Test Pagination Post",
        post_type: "image",
        reddit_community_community_id: communityId,
        files,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Test pagination - Page 1 with limit=5
  const page1 = await api.functional.redditCommunity.posts.files.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        page: 1,
        limit: 5,
      } satisfies IRedditCommunityPostFile.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 5);
  TestValidator.equals("page 1 records", page1.pagination.records, 12);
  TestValidator.equals("page 1 pages", page1.pagination.pages, 3);
  TestValidator.equals("page 1 data length", page1.data.length, 5);
  // 5. Test pagination - Page 2 with limit=5
  const page2 = await api.functional.redditCommunity.posts.files.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        page: 2,
        limit: 5,
      } satisfies IRedditCommunityPostFile.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 5);
  TestValidator.equals("page 2 records", page2.pagination.records, 12);
  TestValidator.equals("page 2 pages", page2.pagination.pages, 3);
  TestValidator.equals("page 2 data length", page2.data.length, 5);
  // 6. Test pagination - Page 3 with limit=5 (last page)
  const page3 = await api.functional.redditCommunity.posts.files.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        page: 3,
        limit: 5,
      } satisfies IRedditCommunityPostFile.IRequest,
    },
  );
  typia.assert(page3);
  TestValidator.equals("page 3 current", page3.pagination.current, 3);
  TestValidator.equals("page 3 limit", page3.pagination.limit, 5);
  TestValidator.equals("page 3 records", page3.pagination.records, 12);
  TestValidator.equals("page 3 pages", page3.pagination.pages, 3);
  TestValidator.equals("page 3 data length", page3.data.length, 2);
  // 7. Test sorting by file_size desc (largest first)
  const sortedBySize = await api.functional.redditCommunity.posts.files.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        sortBy: "file_size",
        sortOrder: "desc",
      } satisfies IRedditCommunityPostFile.IRequest,
    },
  );
  typia.assert(sortedBySize);
  TestValidator.equals(
    "sorted by size records",
    sortedBySize.pagination.records,
    12,
  );
  TestValidator.equals(
    "sorted by size data length",
    sortedBySize.data.length,
    12,
  );
  // Verify files are ordered from largest to smallest
  for (let i = 0; i < sortedBySize.data.length - 1; i++) {
    const currentSize = sortedBySize.data[i].file_size;
    const nextSize = sortedBySize.data[i + 1].file_size;
    TestValidator.predicate("file_size desc order", currentSize >= nextSize);
  }
  // 8. Test sorting by file_name asc (alphabetical)
  const sortedByName = await api.functional.redditCommunity.posts.files.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        sortBy: "file_name",
        sortOrder: "asc",
      } satisfies IRedditCommunityPostFile.IRequest,
    },
  );
  typia.assert(sortedByName);
  TestValidator.equals(
    "sorted by name records",
    sortedByName.pagination.records,
    12,
  );
  TestValidator.equals(
    "sorted by name data length",
    sortedByName.data.length,
    12,
  );
  // Verify files are ordered alphabetically
  for (let i = 0; i < sortedByName.data.length - 1; i++) {
    const currentName = sortedByName.data[i].file_name;
    const nextName = sortedByName.data[i + 1].file_name;
    TestValidator.predicate("file_name asc order", currentName <= nextName);
  }
  // 9. Test sorting by created_at desc (newest first)
  const sortedByCreated =
    await api.functional.redditCommunity.posts.files.index(memberConnection, {
      postId: post.id,
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IRedditCommunityPostFile.IRequest,
    });
  typia.assert(sortedByCreated);
  TestValidator.equals(
    "sorted by created records",
    sortedByCreated.pagination.records,
    12,
  );
  TestValidator.equals(
    "sorted by created data length",
    sortedByCreated.data.length,
    12,
  );
  // Verify files are ordered from newest to oldest
  for (let i = 0; i < sortedByCreated.data.length - 1; i++) {
    const currentTime = sortedByCreated.data[i].created_at;
    const nextTime = sortedByCreated.data[i + 1].created_at;
    TestValidator.predicate("created_at desc order", currentTime >= nextTime);
  }
  // 10. Verify total record count remains constant across all sort orders
  TestValidator.equals(
    "total records consistent (size sort)",
    page1.pagination.records,
    sortedBySize.pagination.records,
  );
  TestValidator.equals(
    "total records consistent (name sort)",
    page1.pagination.records,
    sortedByName.pagination.records,
  );
  TestValidator.equals(
    "total records consistent (created sort)",
    page1.pagination.records,
    sortedByCreated.pagination.records,
  );
}
