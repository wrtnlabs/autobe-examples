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

export async function test_api_temp_uploads_search_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create first authenticated member connection
  const memberConnection1: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(memberConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Create multiple temporary uploads for first member
  const uploads1: ICommunityPlatformTempUpload.ICreate[] = [];
  for (let i = 0; i < 3; i++) {
    const upload =
      await generate_random_community_platform_member_temp_uploads_create(
        memberConnection1,
        {},
      );
    typia.assert(upload);
    uploads1.push(upload);
  }
  // Create second member to test security isolation
  const memberConnection2: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(memberConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password456",
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Create temporary upload for second member
  const upload2 =
    await generate_random_community_platform_member_temp_uploads_create(
      memberConnection2,
      {},
    );
  typia.assert(upload2);
  // Search first member's uploads with default pagination
  const searchResult =
    await api.functional.communityPlatform.member.temp_uploads.index(
      memberConnection1,
      {
        body: {
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Default<1> &
            tags.Minimum<1> as number,
          limit: 20 satisfies number &
            tags.Type<"int32"> &
            tags.Default<20> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies ICommunityPlatformTempUpload.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination metadata
  TestValidator.equals(
    "current page should be 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be default 20",
    searchResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "records should include created uploads",
    searchResult.pagination.records >= uploads1.length,
  );
  TestValidator.predicate(
    "pages count should be calculated correctly",
    searchResult.pagination.pages >= 1,
  );
  // Validate data matches created uploads for member1 only
  const uploadedIds1 = uploads1.map((u) => u.communityPlatformFileId);
  const uploadedId2 = upload2.communityPlatformFileId;
  const resultIds = searchResult.data.map((d) => d.file.id);
  // Verify all created uploads for member1 appear in results
  for (const uploadedId of uploadedIds1) {
    TestValidator.predicate(
      `member1 upload with file ID ${uploadedId} should be in results`,
      resultIds.includes(uploadedId),
    );
  }
  // Verify member2's upload does NOT appear in member1's results (security isolation)
  TestValidator.predicate(
    `member2 upload with file ID ${uploadedId2} should NOT be in member1's results`,
    !resultIds.includes(uploadedId2),
  );
  // Validate upload metadata for each result that matches our uploads
  for (const result of searchResult.data) {
    const matchingUpload = uploads1.find(
      (u) => u.communityPlatformFileId === result.file.id,
    );
    if (matchingUpload) {
      TestValidator.equals(
        `original filename should match for ${result.id}`,
        result.original_filename,
        matchingUpload.originalFilename,
      );
      TestValidator.equals(
        `MIME type should match for ${result.id}`,
        result.mime_type,
        matchingUpload.mimeType,
      );
      TestValidator.equals(
        `file size should match for ${result.id}`,
        result.file_size,
        matchingUpload.fileSize satisfies number as number,
      );
      TestValidator.equals(
        `content hash should match for ${result.id}`,
        result.content_hash,
        matchingUpload.contentHash,
      );
      TestValidator.predicate(
        `status should be valid for ${result.id}`,
        ["pending", "processing", "attached", "expired", "failed"].includes(
          result.status,
        ),
      );
      // Validate uploader matches member1
      TestValidator.equals(
        `uploader should be member1 for ${result.id}`,
        result.uploader.id,
        member1.id,
      );
    }
  }
}