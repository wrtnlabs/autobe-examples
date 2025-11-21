import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";

/**
 * Test retrieval of optimized media files with different optimization levels.
 *
 * Validates that members can access files that have completed optimization
 * processing and verifies that optimization level information is correctly
 * returned. Tests files with various optimization levels (1-100) to ensure
 * proper quality versus size tradeoff information is available.
 */
export async function test_api_member_media_file_retrieval_optimized(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "securePassword123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/registration",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create multiple media files with different optimization levels
  const optimizationLevels = [1, 50, 100] as const; // Test min, middle, max values
  const createdFiles: ICommunityPlatformMediaFile[] = [];

  for (const optimizationLevel of optimizationLevels) {
    const mediaFile =
      await api.functional.communityPlatform.member.mediaFiles.create(
        connection,
        {
          body: {
            file_name: `${RandomGenerator.alphabets(8)}_${optimizationLevel}.jpg`,
            file_type: "image/jpeg",
            file_size: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1000> &
                tags.Maximum<5000000>
            >(),
            storage_path: `/uploads/member_${member.id}/file_${optimizationLevel}.jpg`,
            optimization_level: optimizationLevel,
          } satisfies ICommunityPlatformMediaFile.ICreate,
        },
      );
    typia.assert(mediaFile);
    createdFiles.push(mediaFile);
  }

  // Step 3: Retrieve each media file and validate optimization level information
  for (const createdFile of createdFiles) {
    const retrievedFile =
      await api.functional.communityPlatform.member.mediaFiles.at(connection, {
        mediaFileId: createdFile.id,
      });
    typia.assert(retrievedFile);

    // Validate file metadata matches creation parameters
    TestValidator.equals(
      "retrieved file ID should match created file ID",
      retrievedFile.id,
      createdFile.id,
    );
    TestValidator.equals(
      "retrieved file name should match created file name",
      retrievedFile.file_name,
      createdFile.file_name,
    );
    TestValidator.equals(
      "retrieved file type should match created file type",
      retrievedFile.file_type,
      createdFile.file_type,
    );
    TestValidator.equals(
      "retrieved file size should match created file size",
      retrievedFile.file_size,
      createdFile.file_size,
    );
    TestValidator.equals(
      "retrieved storage path should match created storage path",
      retrievedFile.storage_path,
      createdFile.storage_path,
    );

    // Validate optimization level is correctly returned
    TestValidator.equals(
      "retrieved optimization level should match created optimization level",
      retrievedFile.optimization_level,
      createdFile.optimization_level,
    );

    // Validate member association
    TestValidator.equals(
      "retrieved file should be associated with correct member",
      retrievedFile.community_platform_member_id,
      member.id,
    );

    // Validate status indicates valid processing state
    TestValidator.predicate(
      "file status should indicate valid processing state",
      retrievedFile.status === "optimized" ||
        retrievedFile.status === "uploaded" ||
        retrievedFile.status === "processing",
    );
  }

  // Step 4: Test file without optimization level (undefined)
  const fileWithoutOptimization =
    await api.functional.communityPlatform.member.mediaFiles.create(
      connection,
      {
        body: {
          file_name: `${RandomGenerator.alphabets(8)}_no_opt.png`,
          file_type: "image/png",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<5000000>
          >(),
          storage_path: `/uploads/member_${member.id}/file_no_opt.png`,
          // Intentionally omit optimization_level to test undefined case
        } satisfies ICommunityPlatformMediaFile.ICreate,
      },
    );
  typia.assert(fileWithoutOptimization);

  const retrievedFileWithoutOpt =
    await api.functional.communityPlatform.member.mediaFiles.at(connection, {
      mediaFileId: fileWithoutOptimization.id,
    });
  typia.assert(retrievedFileWithoutOpt);

  // Validate that optimization_level can be undefined
  TestValidator.equals(
    "file without optimization level should have undefined optimization_level",
    retrievedFileWithoutOpt.optimization_level,
    undefined,
  );

  // Step 5: Test error case - retrieving non-existent file
  await TestValidator.error(
    "retrieving non-existent file should fail",
    async () => {
      const nonExistentId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.communityPlatform.member.mediaFiles.at(connection, {
        mediaFileId: nonExistentId,
      });
    },
  );
}
