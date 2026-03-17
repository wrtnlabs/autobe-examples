import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformFileProcess } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileProcess";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformTempUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTempUpload";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformFileProcess } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFileProcess";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_files_upload } from "../../../generate/generate_random_community_platform_member_files_upload";
import { prepare_random_community_platform_temp_upload } from "../../../prepare/prepare_random_community_platform_temp_upload";

export async function test_api_file_processes_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Upload a file to generate processing records
  const tempUpload =
    await generate_random_community_platform_member_files_upload(
      memberConnection,
      {},
    );
  typia.assert(tempUpload);
  // 3. Test basic pagination
  const basicSearch =
    await api.functional.communityPlatform.files.processes.index(
      memberConnection,
      {
        fileId: tempUpload.file.id,
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformFileProcess.IRequest,
      },
    );
  typia.assert(basicSearch);
  TestValidator.equals(
    "basic pagination file reference",
    basicSearch.data[0]?.file.id,
    tempUpload.file.id,
  );
  TestValidator.predicate(
    "pagination metadata present",
    basicSearch.pagination.records >= 0 &&
      basicSearch.pagination.pages >= 0 &&
      basicSearch.pagination.current >= 1 &&
      basicSearch.pagination.limit >= 1,
  );
  // 4. Test date range filtering by started_at
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const dateRangeSearch =
    await api.functional.communityPlatform.files.processes.index(
      memberConnection,
      {
        fileId: tempUpload.file.id,
        body: {
          started_at_from: yesterday,
          started_at_to: now,
        } satisfies ICommunityPlatformFileProcess.IRequest,
      },
    );
  typia.assert(dateRangeSearch);
  // Validate date range filtering (if there are records)
  if (dateRangeSearch.data.length > 0) {
    for (const process of dateRangeSearch.data) {
      if (process.startedAt !== null) {
        TestValidator.predicate(
          "started_at within date range",
          process.startedAt >= yesterday && process.startedAt <= now,
        );
      }
    }
  }
  // 5. Test error_present filtering (true/false)
  const errorSearch =
    await api.functional.communityPlatform.files.processes.index(
      memberConnection,
      {
        fileId: tempUpload.file.id,
        body: {
          error_present: true,
        } satisfies ICommunityPlatformFileProcess.IRequest,
      },
    );
  typia.assert(errorSearch);
  // Validate error_present filter
  if (errorSearch.data.length > 0) {
    for (const process of errorSearch.data) {
      TestValidator.predicate(
        "error present when error_present=true",
        process.errorMessage !== null && process.errorMessage !== undefined,
      );
    }
  }
  // 6. Test combination of multiple filters
  const combinedSearch =
    await api.functional.communityPlatform.files.processes.index(
      memberConnection,
      {
        fileId: tempUpload.file.id,
        body: {
          page: 1,
          limit: 5,
          started_at_from: yesterday,
          error_present: false,
        } satisfies ICommunityPlatformFileProcess.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // Validate combined filter logic
  if (combinedSearch.data.length > 0) {
    for (const process of combinedSearch.data) {
      // Check error_present filter
      TestValidator.predicate(
        "no error when error_present=false",
        process.errorMessage === null,
      );
      // Check date range filter
      if (process.startedAt !== null) {
        TestValidator.predicate(
          "started_at within combined date range",
          process.startedAt >= yesterday,
        );
      }
    }
  }
  // 7. Verify derived status field
  for (const process of basicSearch.data) {
    TestValidator.predicate(
      "status field is valid",
      process.status === "pending" ||
        process.status === "processing" ||
        process.status === "completed" ||
        process.status === "failed",
    );
    // Validate status derivation logic
    if (process.startedAt === null) {
      TestValidator.equals(
        "pending status when startedAt null",
        process.status,
        "pending",
      );
    } else if (process.completedAt === null) {
      TestValidator.equals(
        "processing status when completedAt null",
        process.status,
        "processing",
      );
    } else if (process.errorMessage === null) {
      TestValidator.equals(
        "completed status when no error",
        process.status,
        "completed",
      );
    } else {
      TestValidator.equals(
        "failed status when error present",
        process.status,
        "failed",
      );
    }
  }
}
