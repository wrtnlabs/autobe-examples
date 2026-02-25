import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityFile";
import type { ICommunityFileVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityFileVariant";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_files_create } from "../../../generate/generate_random_community_member_files_create";
import { prepare_random_community_file } from "../../../prepare/prepare_random_community_file";

export async function test_api_file_list_search_and_dimensions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Upload multiple files with varied names for testing
  const files = await ArrayUtil.asyncRepeat(5, async () =>
    generate_random_community_member_files_create(memberConnection, {
      body: {
        file_type: "AVATAR",
      },
    }),
  );
  // 3. Test partial filename search - search for common characters
  const allFilesSearch = await api.functional.community.member.files.index(
    memberConnection,
    {
      body: {} satisfies ICommunityFile.IRequest,
    },
  );
  typia.assert(allFilesSearch);
  TestValidator.predicate(
    "all files search returns uploaded files",
    allFilesSearch.data.length >= files.length,
  );
  // 4. Test size range filtering - find larger files
  const avgSize = files.reduce((sum, f) => sum + f.size, 0) / files.length;
  const largeFiles = await api.functional.community.member.files.index(
    memberConnection,
    {
      body: {
        sizeMin: Math.floor(avgSize),
      } satisfies ICommunityFile.IRequest,
    },
  );
  typia.assert(largeFiles);
  TestValidator.predicate(
    "sizeMin filter returns files with size >= avgSize",
    largeFiles.data.every((f) => f.size >= Math.floor(avgSize)),
  );
  // 5. Test size range filtering - find smaller files
  const smallFiles = await api.functional.community.member.files.index(
    memberConnection,
    {
      body: {
        sizeMax: Math.ceil(avgSize),
      } satisfies ICommunityFile.IRequest,
    },
  );
  typia.assert(smallFiles);
  TestValidator.predicate(
    "sizeMax filter returns files with size <= avgSize",
    smallFiles.data.every((f) => f.size <= Math.ceil(avgSize)),
  );
  // 6. Test dimension range filtering for images
  const filesWithDimensions = files.filter(
    (f) => f.width !== null && f.height !== null,
  );
  if (filesWithDimensions.length > 0) {
    const maxWidth = Math.max(...filesWithDimensions.map((f) => f.width ?? 0));
    const widthFiltered = await api.functional.community.member.files.index(
      memberConnection,
      {
        body: {
          widthMax: maxWidth,
        } satisfies ICommunityFile.IRequest,
      },
    );
    typia.assert(widthFiltered);
    TestValidator.predicate(
      "widthMax filter returns files with width <= maxWidth",
      widthFiltered.data
        .filter((f) => f.width !== null)
        .every((f) => (f.width ?? 0) <= maxWidth),
    );
  }
  // 7. Test date range filtering
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const recentFiles = await api.functional.community.member.files.index(
    memberConnection,
    {
      body: {
        createdAtFrom: oneHourAgo.toISOString(),
        createdAtTo: now.toISOString(),
      } satisfies ICommunityFile.IRequest,
    },
  );
  typia.assert(recentFiles);
  TestValidator.predicate(
    "date range filter returns recently uploaded files",
    recentFiles.data.length >= files.length,
  );
  // 8. Test sorting by size ascending
  const sortedBySizeAsc = await api.functional.community.member.files.index(
    memberConnection,
    {
      body: {
        sortBy: "size",
        sortOrder: "asc",
      } satisfies ICommunityFile.IRequest,
    },
  );
  typia.assert(sortedBySizeAsc);
  for (let i = 1; i < sortedBySizeAsc.data.length; i++) {
    TestValidator.predicate(
      "size ascending sort is correct",
      sortedBySizeAsc.data[i - 1].size <= sortedBySizeAsc.data[i].size,
    );
  }
  // 9. Test sorting by original_name descending
  const sortedByNameDesc = await api.functional.community.member.files.index(
    memberConnection,
    {
      body: {
        sortBy: "original_name",
        sortOrder: "desc",
      } satisfies ICommunityFile.IRequest,
    },
  );
  typia.assert(sortedByNameDesc);
  for (let i = 1; i < sortedByNameDesc.data.length; i++) {
    TestValidator.predicate(
      "name descending sort is correct",
      sortedByNameDesc.data[i - 1].originalName >=
        sortedByNameDesc.data[i].originalName,
    );
  }
  // 10. Test pagination with filtered results
  const paginatedResult = await api.functional.community.member.files.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies ICommunityFile.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination limit works correctly",
    paginatedResult.data.length,
    Math.min(2, paginatedResult.pagination.records),
  );
  TestValidator.predicate(
    "pagination current page is 1",
    paginatedResult.pagination.current === 1,
  );
}
