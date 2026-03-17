import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformTempUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTempUpload";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformTempUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformTempUpload";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_temp_uploads_create } from "../../../generate/generate_random_community_platform_member_temp_uploads_create";
import { prepare_random_community_platform_temp_upload } from "../../../prepare/prepare_random_community_platform_temp_upload";

/**
 * Test search behavior when no uploads match filter criteria.
 * 1. Authenticate as a member and create a temporary upload with 'pending' status
 * 2. Search with filters that don't match the created upload
 * 3. Verify API returns empty results with proper pagination metadata
 */
export async function test_api_temp_uploads_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Create a temporary upload with status 'pending'
  const upload =
    await generate_random_community_platform_member_temp_uploads_create(
      memberConnection,
      {},
    );
  typia.assert(upload);
  // Test 1: Filter by status 'attached' (doesn't match pending)
  const attachedResult =
    await api.functional.communityPlatform.member.temp_uploads.index(
      memberConnection,
      {
        body: {
          status: "attached",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformTempUpload.IRequest,
      },
    );
  typia.assert(attachedResult);
  TestValidator.equals(
    "attached filter returns empty array",
    attachedResult.data,
    [],
  );
  TestValidator.equals(
    "pagination records = 0 for attached filter",
    attachedResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages = 0 for attached filter",
    attachedResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current = 1 for attached filter",
    attachedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit = requested limit for attached filter",
    attachedResult.pagination.limit,
    20,
  );
  // Test 2: Filter by non-existent uploader ID
  const nonExistentUploaderResult =
    await api.functional.communityPlatform.member.temp_uploads.index(
      memberConnection,
      {
        body: {
          uploader_id: typia.random<string & tags.Format<"uuid">>(),
          page: 2,
          limit: 10,
        } satisfies ICommunityPlatformTempUpload.IRequest,
      },
    );
  typia.assert(nonExistentUploaderResult);
  TestValidator.equals(
    "non-existent uploader filter returns empty array",
    nonExistentUploaderResult.data,
    [],
  );
  TestValidator.equals(
    "pagination records = 0 for non-existent uploader",
    nonExistentUploaderResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages = 0 for non-existent uploader",
    nonExistentUploaderResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current = requested page for non-existent uploader",
    nonExistentUploaderResult.pagination.current,
    2,
  );
  // Test 3: Filter by non-existent content hash
  const nonExistentHashResult =
    await api.functional.communityPlatform.member.temp_uploads.index(
      memberConnection,
      {
        body: {
          content_hash: typia.random<string & tags.Pattern<"^[a-f0-9]{64}$">>(),
          limit: 50,
        } satisfies ICommunityPlatformTempUpload.IRequest,
      },
    );
  typia.assert(nonExistentHashResult);
  TestValidator.equals(
    "non-existent content hash filter returns empty array",
    nonExistentHashResult.data,
    [],
  );
  TestValidator.equals(
    "pagination records = 0 for non-existent hash",
    nonExistentHashResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages = 0 for non-existent hash",
    nonExistentHashResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current = 1 for non-existent hash",
    nonExistentHashResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit = requested limit for non-existent hash",
    nonExistentHashResult.pagination.limit,
    50,
  );
  // Test 4: Filter with future creation date range
  const futureDate = new Date(Date.now() + 86400000); // Tomorrow
  const futureDateResult =
    await api.functional.communityPlatform.member.temp_uploads.index(
      memberConnection,
      {
        body: {
          created_at_after: futureDate.toISOString(),
          limit: 30,
        } satisfies ICommunityPlatformTempUpload.IRequest,
      },
    );
  typia.assert(futureDateResult);
  TestValidator.equals(
    "future date filter returns empty array",
    futureDateResult.data,
    [],
  );
  TestValidator.equals(
    "pagination records = 0 for future date",
    futureDateResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages = 0 for future date",
    futureDateResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current = 1 for future date",
    futureDateResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit = requested limit for future date",
    futureDateResult.pagination.limit,
    30,
  );
  // Verify the original upload still exists with proper filter
  const originalFilterResult =
    await api.functional.communityPlatform.member.temp_uploads.index(
      memberConnection,
      {
        body: {
          status: "pending",
          uploader_id: upload.communityPlatformFileId,
        } satisfies ICommunityPlatformTempUpload.IRequest,
      },
    );
  typia.assert(originalFilterResult);
  TestValidator.predicate(
    "original upload still retrievable with matching filter",
    originalFilterResult.data.length > 0,
  );
}
