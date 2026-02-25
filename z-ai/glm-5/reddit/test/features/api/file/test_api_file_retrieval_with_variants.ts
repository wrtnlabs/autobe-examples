import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityFile";
import type { ICommunityFileVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityFileVariant";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

/**
 * Test that file retrieval response includes responsive image variants when available.
 *
 * Scenario: A member uploads a post image and retrieves it to verify the response
 * includes generated variants for responsive display.
 *
 * Steps:
 * 1. Register and authenticate as a new member
 * 2. Upload a post image (POST_IMAGE type, valid format, within 20MB limit)
 * 3. Store the returned file ID from the upload response
 * 4. Call GET /community/member/files/{fileId} with the stored file ID
 * 5. Verify the response includes the variants array with proper structure
 */
export async function test_api_file_retrieval_with_variants(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Upload a post image
  const uploadedFile = await generate_random_community_member_files_create(
    memberConnection,
    {
      body: {
        file_type: "POST_IMAGE",
      },
    },
  );
  typia.assert(uploadedFile);
  // 3. Retrieve the file using GET endpoint
  const retrievedFile = await api.functional.community.member.files.at(
    memberConnection,
    {
      fileId: uploadedFile.id,
    },
  );
  typia.assert(retrievedFile);
  // 4. Verify file details match uploaded file
  TestValidator.equals("file ID matches", retrievedFile.id, uploadedFile.id);
  TestValidator.equals(
    "file type matches",
    retrievedFile.file_type,
    "POST_IMAGE",
  );
  // 5. Verify variants array exists and has proper structure
  TestValidator.predicate(
    "variants array exists",
    Array.isArray(retrievedFile.variants),
  );
  // 6. Verify each variant has required properties
  const validVariantTypes = ["thumbnail", "medium", "large"];
  for (const variant of retrievedFile.variants) {
    TestValidator.predicate(
      "variant type is valid",
      validVariantTypes.includes(variant.variantType),
    );
    TestValidator.predicate(
      "variant has storage path",
      typeof variant.storagePath === "string" && variant.storagePath.length > 0,
    );
    TestValidator.predicate(
      "variant has positive dimensions",
      variant.width > 0 && variant.height > 0,
    );
    TestValidator.predicate(
      "variant has positive file size",
      variant.fileSize > 0,
    );
    TestValidator.predicate(
      "variant has valid mime type",
      typeof variant.mimeType === "string" && variant.mimeType.length > 0,
    );
    TestValidator.predicate(
      "variant has valid ID",
      typeof variant.id === "string" && variant.id.length > 0,
    );
    TestValidator.predicate(
      "variant has valid createdAt",
      typeof variant.createdAt === "string",
    );
  }
  // 7. Verify variants have unique storage paths (no duplicates)
  const storagePaths = retrievedFile.variants.map((v) => v.storagePath);
  const uniquePaths = new Set(storagePaths);
  TestValidator.predicate(
    "variant storage paths are unique",
    storagePaths.length === uniquePaths.size,
  );
}
