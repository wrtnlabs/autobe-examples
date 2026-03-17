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
 * Test advanced filtering capabilities of temporary uploads search.
 * 1. Authenticate as a member
 * 2. Create multiple temporary uploads with varied properties (statuses, sizes, MIME types, expiration dates)
 * 3. Test filtering by specific status (pending)
 * 4. Test filtering by file size range (min/max)
 * 5. Test filtering by MIME type (image/jpeg)
 * 6. Test filtering by creation date range
 * 7. Test sorting options: file size descending, creation date ascending, expiration date ascending
 * 8. Test search parameter for partial filename matching
 * 9. Validate each returned upload matches all applied filters
 */
export async function test_api_temp_uploads_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create multiple temporary uploads with varied properties
  const uploads = await Promise.all(
    ArrayUtil.repeat(10, async (index) => {
      // Vary statuses: pending, processing, attached
      const statuses = ["pending", "processing", "attached"] as const;
      const status = statuses[index % statuses.length];
      // Vary file sizes: 1000-50000 bytes
      const fileSize = typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<50000>
      >();
      // Vary MIME types: image/jpeg, image/png, application/pdf
      const mimeTypes = ["image/jpeg", "image/png", "application/pdf"] as const;
      const mimeType = mimeTypes[index % mimeTypes.length];
      // Vary expiration dates: some soon, some far
      const now = new Date();
      const expiresAt = new Date(
        now.getTime() +
          (index % 3 === 0 ? 1000 * 60 * 60 : 1000 * 60 * 60 * 24 * 7),
      ).toISOString();
      // Vary creation dates: different timestamps
      const createdAt = new Date(
        now.getTime() - (index % 2 === 0 ? 1000 * 60 * 30 : 1000 * 60 * 60 * 2),
      ).toISOString();
      // Create upload with varied filename
      const upload =
        await generate_random_community_platform_member_temp_uploads_create(
          memberConnection,
          {
            body: {
              communityPlatformFileId: typia.random<
                string & tags.Format<"uuid">
              >(),
              originalFilename: `test_file_${index}_${RandomGenerator.alphaNumeric(4)}.txt`,
              mimeType,
              fileSize,
              contentHash: typia.random<
                string & tags.Pattern<"^[a-f0-9]{64}$">
              >(),
              uploadIp: typia.random<string & tags.Format<"ipv4">>(),
              userAgent: "TestAgent/1.0",
            } satisfies ICommunityPlatformTempUpload.ICreate,
          },
        );
      typia.assert(upload);
      return { upload, status, fileSize, mimeType, expiresAt, createdAt };
    }),
  );
  // Wait a moment for database consistency
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Test filtering by specific status (pending)
  const pendingResult =
    await api.functional.communityPlatform.member.temp_uploads.index(
      memberConnection,
      {
        body: {
          status: "pending",
          limit: 100,
        } satisfies ICommunityPlatformTempUpload.IRequest,
      },
    );
  typia.assert(pendingResult);
  // Validate all returned uploads have status "pending"
  for (const item of pendingResult.data) {
    TestValidator.equals("status should be pending", item.status, "pending");
  }
  // 4. Test filtering by file size range
  const minSize = 5000;
  const maxSize = 20000;
  const sizeResult =
    await api.functional.communityPlatform.member.temp_uploads.index(
      memberConnection,
      {
        body: {
          file_size_min: minSize,
          file_size_max: maxSize,
          limit: 100,
        } satisfies ICommunityPlatformTempUpload.IRequest,
      },
    );
  typia.assert(sizeResult);
  for (const item of sizeResult.data) {
    TestValidator.predicate(
      `file size should be between ${minSize} and ${maxSize}`,
      item.file_size >= minSize && item.file_size <= maxSize,
    );
  }
  // 5. Test filtering by MIME type
  const mimeResult =
    await api.functional.communityPlatform.member.temp_uploads.index(
      memberConnection,
      {
        body: {
          mime_type: "image/jpeg",
          limit: 100,
        } satisfies ICommunityPlatformTempUpload.IRequest,
      },
    );
  typia.assert(mimeResult);
  for (const item of mimeResult.data) {
    TestValidator.equals(
      "MIME type should be image/jpeg",
      item.mime_type,
      "image/jpeg",
    );
  }
  // 6. Test filtering by creation date range
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 1000 * 60 * 60).toISOString();
  const oneHourFuture = new Date(now.getTime() + 1000 * 60 * 60).toISOString();
  const dateResult =
    await api.functional.communityPlatform.member.temp_uploads.index(
      memberConnection,
      {
        body: {
          created_at_after: oneHourAgo,
          created_at_before: oneHourFuture,
          limit: 100,
        } satisfies ICommunityPlatformTempUpload.IRequest,
      },
    );
  typia.assert(dateResult);
  for (const item of dateResult.data) {
    const createdAt = new Date(item.created_at);
    const after = new Date(oneHourAgo);
    const before = new Date(oneHourFuture);
    TestValidator.predicate(
      "created_at should be within range",
      createdAt >= after && createdAt <= before,
    );
  }
  // 7. Test sorting options
  // File size descending
  const sizeSortResult =
    await api.functional.communityPlatform.member.temp_uploads.index(
      memberConnection,
      {
        body: {
          sort: "file_size_desc",
          limit: 100,
        } satisfies ICommunityPlatformTempUpload.IRequest,
      },
    );
  typia.assert(sizeSortResult);
  // Verify descending order
  for (let i = 1; i < sizeSortResult.data.length; i++) {
    TestValidator.predicate(
      "file sizes should be in descending order",
      sizeSortResult.data[i - 1].file_size >= sizeSortResult.data[i].file_size,
    );
  }
  // Creation date ascending
  const createdSortResult =
    await api.functional.communityPlatform.member.temp_uploads.index(
      memberConnection,
      {
        body: {
          sort: "created_at_asc",
          limit: 100,
        } satisfies ICommunityPlatformTempUpload.IRequest,
      },
    );
  typia.assert(createdSortResult);
  // Verify ascending order
  for (let i = 1; i < createdSortResult.data.length; i++) {
    const prev = new Date(createdSortResult.data[i - 1].created_at);
    const curr = new Date(createdSortResult.data[i].created_at);
    TestValidator.predicate(
      "created_at should be in ascending order",
      prev <= curr,
    );
  }
  // Expiration date ascending
  const expireSortResult =
    await api.functional.communityPlatform.member.temp_uploads.index(
      memberConnection,
      {
        body: {
          sort: "expires_at_asc",
          limit: 100,
        } satisfies ICommunityPlatformTempUpload.IRequest,
      },
    );
  typia.assert(expireSortResult);
  // Verify ascending order
  for (let i = 1; i < expireSortResult.data.length; i++) {
    const prev = new Date(expireSortResult.data[i - 1].expires_at);
    const curr = new Date(expireSortResult.data[i].expires_at);
    TestValidator.predicate(
      "expires_at should be in ascending order",
      prev <= curr,
    );
  }
  // 8. Test search parameter for partial filename matching
  const searchResult =
    await api.functional.communityPlatform.member.temp_uploads.index(
      memberConnection,
      {
        body: {
          search: "test_file",
          limit: 100,
        } satisfies ICommunityPlatformTempUpload.IRequest,
      },
    );
  typia.assert(searchResult);
  for (const item of searchResult.data) {
    TestValidator.predicate(
      "filename should contain search term",
      item.original_filename.toLowerCase().includes("test_file"),
    );
  }
  // 9. Test complex combined filtering
  const combinedResult =
    await api.functional.communityPlatform.member.temp_uploads.index(
      memberConnection,
      {
        body: {
          status: "pending",
          mime_type: "image/jpeg",
          file_size_min: 1000,
          file_size_max: 30000,
          created_at_after: oneHourAgo,
          limit: 100,
        } satisfies ICommunityPlatformTempUpload.IRequest,
      },
    );
  typia.assert(combinedResult);
  for (const item of combinedResult.data) {
    TestValidator.equals(
      "status should match combined filter",
      item.status,
      "pending",
    );
    TestValidator.equals(
      "MIME type should match combined filter",
      item.mime_type,
      "image/jpeg",
    );
    TestValidator.predicate(
      "file size should match combined filter",
      item.file_size >= 1000 && item.file_size <= 30000,
    );
    const createdAt = new Date(item.created_at);
    const after = new Date(oneHourAgo);
    TestValidator.predicate(
      "created_at should be after threshold",
      createdAt >= after,
    );
  }
}
