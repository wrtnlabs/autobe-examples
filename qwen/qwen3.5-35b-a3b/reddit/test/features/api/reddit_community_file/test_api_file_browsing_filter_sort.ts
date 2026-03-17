import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityFile";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import type { IRedditCommunityFileOfCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfCommunity";
import type { IRedditCommunityFileOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfUser";
import type { IRedditCommunityFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileThumbnail";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_files_create } from "../../../generate/generate_random_reddit_community_member_files_create";
import { prepare_random_reddit_community_file } from "../../../prepare/prepare_random_reddit_community_file";

export async function test_api_file_browsing_filter_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(joinResult);
  // Create member connection with auth token
  const memberAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: joinResult.token.access,
    },
  };
  // Generate a valid UUID for owner_id
  const ownerId = typia.random<string & tags.Format<"uuid">>();
  // 2. Create three test files with different types
  const avatarFile = await generate_random_reddit_community_member_files_create(
    memberAuthConnection,
    {
      body: {
        file_type: "avatar" as const,
        owner_id: ownerId,
        file_uri: "https://example.com/avatar.jpg",
      } satisfies IRedditCommunityFile.ICreate,
    },
  );
  typia.assert(avatarFile);
  const postFile = await generate_random_reddit_community_member_files_create(
    memberAuthConnection,
    {
      body: {
        file_type: "post" as const,
        owner_id: ownerId,
        file_uri: "https://example.com/post.jpg",
      } satisfies IRedditCommunityFile.ICreate,
    },
  );
  typia.assert(postFile);
  const communityFile =
    await generate_random_reddit_community_member_files_create(
      memberAuthConnection,
      {
        body: {
          file_type: "community_icon" as const,
          owner_id: ownerId,
          file_uri: "https://example.com/icon.jpg",
        } satisfies IRedditCommunityFile.ICreate,
      },
    );
  typia.assert(communityFile);
  // 3. Test filtering by file_type='user_avatar'
  const avatarFilterResult = await api.functional.redditCommunity.files.index(
    connection,
    {
      body: {
        file_type: "user_avatar",
      } satisfies IRedditCommunityFile.IRequest,
    },
  );
  typia.assert(avatarFilterResult);
  // 4. Verify response contains only user_avatar files
  for (const file of avatarFilterResult.data) {
    TestValidator.equals(
      "all filtered files should be user_avatar",
      file.fileType,
      "user_avatar",
    );
  }
  // 5. Test filtering by mime_type
  const mimeTypeFilterResult = await api.functional.redditCommunity.files.index(
    connection,
    {
      body: {
        mime_type: "image/jpeg",
      } satisfies IRedditCommunityFile.IRequest,
    },
  );
  typia.assert(mimeTypeFilterResult);
  for (const file of mimeTypeFilterResult.data) {
    TestValidator.equals(
      "all files should match mime_type filter",
      file.mimeType,
      "image/jpeg",
    );
  }
  // 6. Test filtering by date range
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000).toISOString();
  const oneMinuteFuture = new Date(now.getTime() + 60 * 1000).toISOString();
  const dateFilterResult = await api.functional.redditCommunity.files.index(
    connection,
    {
      body: {
        created_after: oneMinuteAgo,
        created_before: oneMinuteFuture,
      } satisfies IRedditCommunityFile.IRequest,
    },
  );
  typia.assert(dateFilterResult);
  // 7. Verify all files are within date range
  for (const file of dateFilterResult.data) {
    const fileDate = new Date(file.createdAt);
    const afterDate = new Date(oneMinuteAgo);
    const beforeDate = new Date(oneMinuteFuture);
    TestValidator.predicate(
      "file created_at should be within range",
      fileDate >= afterDate && fileDate <= beforeDate,
    );
  }
  // 8. Test filtering by file size range
  const sizeFilterResult = await api.functional.redditCommunity.files.index(
    connection,
    {
      body: {
        min_file_size: 1000,
        max_file_size: 100000,
      } satisfies IRedditCommunityFile.IRequest,
    },
  );
  typia.assert(sizeFilterResult);
  // 9. Verify files are within size range
  for (const file of sizeFilterResult.data) {
    if (file.fileSize !== undefined) {
      TestValidator.predicate(
        "file size should be >= min_file_size",
        file.fileSize >= 1000,
      );
      TestValidator.predicate(
        "file size should be <= max_file_size",
        file.fileSize <= 100000,
      );
    }
  }
  // 10. Test sorting by file_size ascending
  const ascendingSortResult = await api.functional.redditCommunity.files.index(
    connection,
    {
      body: {
        sort_by: "file_size",
        sort_order: "asc",
      } satisfies IRedditCommunityFile.IRequest,
    },
  );
  typia.assert(ascendingSortResult);
  // Verify files are sorted in ascending order
  for (let i = 1; i < ascendingSortResult.data.length; i++) {
    const prevFileSize = ascendingSortResult.data[i - 1].fileSize;
    const currFileSize = ascendingSortResult.data[i].fileSize;
    if (prevFileSize !== undefined && currFileSize !== undefined) {
      TestValidator.predicate(
        "files should be sorted ascending by file_size",
        prevFileSize <= currFileSize,
      );
    }
  }
  // 11. Test sorting by file_size descending
  const descendingSortResult = await api.functional.redditCommunity.files.index(
    connection,
    {
      body: {
        sort_by: "file_size",
        sort_order: "desc",
      } satisfies IRedditCommunityFile.IRequest,
    },
  );
  typia.assert(descendingSortResult);
  // Verify files are sorted in descending order
  for (let i = 1; i < descendingSortResult.data.length; i++) {
    const prevFileSize = descendingSortResult.data[i - 1].fileSize;
    const currFileSize = descendingSortResult.data[i].fileSize;
    if (prevFileSize !== undefined && currFileSize !== undefined) {
      TestValidator.predicate(
        "files should be sorted descending by file_size",
        prevFileSize >= currFileSize,
      );
    }
  }
  // 12. Test combined filters (AND logic)
  const combinedFilterResult = await api.functional.redditCommunity.files.index(
    connection,
    {
      body: {
        file_type: "user_avatar",
        min_file_size: 1000,
        max_file_size: 100000,
        sort_by: "file_size",
        sort_order: "asc",
      } satisfies IRedditCommunityFile.IRequest,
    },
  );
  typia.assert(combinedFilterResult);
  // Verify all results satisfy ALL filters
  for (const file of combinedFilterResult.data) {
    TestValidator.equals(
      "combined filter should return user_avatar only",
      file.fileType,
      "user_avatar",
    );
    if (file.fileSize !== undefined) {
      TestValidator.predicate(
        "file size should be within combined filter range",
        file.fileSize >= 1000 && file.fileSize <= 100000,
      );
    }
  }
  // 13. Test sorting with pagination
  const paginatedSortResult = await api.functional.redditCommunity.files.index(
    connection,
    {
      body: {
        sort_by: "file_size",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityFile.IRequest,
    },
  );
  typia.assert(paginatedSortResult);
  // Verify pagination metadata is present
  TestValidator.predicate(
    "pagination should have valid current page",
    paginatedSortResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be within bounds",
    paginatedSortResult.pagination.limit > 0 &&
      paginatedSortResult.pagination.limit <= 100,
  );
  // Verify sorting is maintained within paginated results
  for (let i = 1; i < paginatedSortResult.data.length; i++) {
    const prevFileSize = paginatedSortResult.data[i - 1].fileSize;
    const currFileSize = paginatedSortResult.data[i].fileSize;
    if (prevFileSize !== undefined && currFileSize !== undefined) {
      TestValidator.predicate(
        "paginated results should maintain sort order",
        prevFileSize >= currFileSize,
      );
    }
  }
}