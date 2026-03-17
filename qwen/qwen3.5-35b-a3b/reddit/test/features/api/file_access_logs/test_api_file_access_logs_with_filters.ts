import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityFileAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityFileAccessLog";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import type { IRedditCommunityFileAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileAccessLog";
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

export async function test_api_file_access_logs_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string>() as string & tags.Format<"uri">,
    },
  });
  typia.assert(joinOutput);
  memberConnection.headers!.Authorization = joinOutput.token.access;
  // 2. Create a file that will have access logs
  const file = await generate_random_reddit_community_member_files_create(
    memberConnection,
    {
      body: {
        file_type: "post" as const,
        owner_id: typia.random<string & tags.Format<"uuid">>(),
        file_uri: typia.random<string>() as string & tags.Format<"uri">,
      } satisfies IRedditCommunityFile.ICreate,
    },
  );
  typia.assert(file);
  // 3. Test filtering by date range
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 1);
  const toDate = new Date();
  const filteredByDate =
    await api.functional.redditCommunity.member.files.access_logs.index(
      memberConnection,
      {
        fileId: file.id,
        body: {
          fromCreatedAt: fromDate.toISOString(),
          toCreatedAt: toDate.toISOString(),
          limit: 20,
          page: 1,
        } satisfies IRedditCommunityFileAccessLog.IRequest,
      },
    );
  typia.assert(filteredByDate);
  // 4. Test filtering by access type
  const filteredByAccessType =
    await api.functional.redditCommunity.member.files.access_logs.index(
      memberConnection,
      {
        fileId: file.id,
        body: {
          accessType: "download",
          limit: 20,
          page: 1,
        } satisfies IRedditCommunityFileAccessLog.IRequest,
      },
    );
  typia.assert(filteredByAccessType);
  // 5. Test combined filters
  const combinedFiltered =
    await api.functional.redditCommunity.member.files.access_logs.index(
      memberConnection,
      {
        fileId: file.id,
        body: {
          fromCreatedAt: fromDate.toISOString(),
          toCreatedAt: toDate.toISOString(),
          accessType: "view",
          limit: 20,
          page: 1,
        } satisfies IRedditCommunityFileAccessLog.IRequest,
      },
    );
  typia.assert(combinedFiltered);
  // 6. Test sorting by createdAt ascending
  const sortedByCreatedAtAsc =
    await api.functional.redditCommunity.member.files.access_logs.index(
      memberConnection,
      {
        fileId: file.id,
        body: {
          sortField: "createdAt",
          sortOrder: "asc",
          limit: 20,
          page: 1,
        } satisfies IRedditCommunityFileAccessLog.IRequest,
      },
    );
  typia.assert(sortedByCreatedAtAsc);
  // 7. Test sorting by createdAt descending
  const sortedByCreatedAtDesc =
    await api.functional.redditCommunity.member.files.access_logs.index(
      memberConnection,
      {
        fileId: file.id,
        body: {
          sortField: "createdAt",
          sortOrder: "desc",
          limit: 20,
          page: 1,
        } satisfies IRedditCommunityFileAccessLog.IRequest,
      },
    );
  typia.assert(sortedByCreatedAtDesc);
  // 8. Test sorting by responseTimeMs
  const sortedByResponseTime =
    await api.functional.redditCommunity.member.files.access_logs.index(
      memberConnection,
      {
        fileId: file.id,
        body: {
          sortField: "responseTimeMs",
          sortOrder: "desc",
          limit: 20,
          page: 1,
        } satisfies IRedditCommunityFileAccessLog.IRequest,
      },
    );
  typia.assert(sortedByResponseTime);
  // 9. Validate pagination metadata
  TestValidator.predicate(
    "pagination records is non-negative",
    filteredByDate.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    filteredByDate.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination current is positive",
    filteredByDate.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    filteredByDate.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    filteredByDate.pagination.pages,
    Math.ceil(
      filteredByDate.pagination.records / filteredByDate.pagination.limit,
    ),
  );
  // 10. Validate filtered results respect accessType filter
  if (filteredByAccessType.data.length > 0) {
    TestValidator.predicate(
      "all filtered logs match accessType download",
      filteredByAccessType.data.every((log) => log.accessType === "download"),
    );
  }
  // 11. Validate filtered results respect date range filter
  if (filteredByDate.data.length > 0) {
    TestValidator.predicate(
      "all filtered logs within date range",
      filteredByDate.data.every(
        (log) =>
          new Date(log.createdAt) >= fromDate &&
          new Date(log.createdAt) <= toDate,
      ),
    );
  }
  // 12. Validate sorting order
  if (sortedByCreatedAtAsc.data.length > 1) {
    TestValidator.predicate(
      "createdAt ascending order",
      sortedByCreatedAtAsc.data.every(
        (log, i, arr) =>
          i === 0 || new Date(log.createdAt) >= new Date(arr[i - 1].createdAt),
      ),
    );
  }
  if (sortedByCreatedAtDesc.data.length > 1) {
    TestValidator.predicate(
      "createdAt descending order",
      sortedByCreatedAtDesc.data.every(
        (log, i, arr) =>
          i === 0 || new Date(log.createdAt) <= new Date(arr[i - 1].createdAt),
      ),
    );
  }
}