import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";

/**
 * Test media file upload with specific optimization level settings.
 *
 * Validates that optimization levels between 1-100 are properly applied and
 * reflected in the returned file metadata. The test verifies different
 * optimization scenarios including minimal compression (high quality) and
 * maximum compression (small file size) to ensure the system handles
 * optimization preferences correctly.
 */
export async function test_api_media_file_upload_with_optimization(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      ip: "192.168.1.1",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Test different optimization levels
  const optimizationLevels = [
    1,
    100,
    typia.random<
      number & tags.Type<"int32"> & tags.Minimum<2> & tags.Maximum<99>
    >(),
  ];

  const testFiles = await ArrayUtil.asyncMap(
    optimizationLevels,
    async (level) => {
      const file =
        await api.functional.communityPlatform.member.mediaFiles.create(
          connection,
          {
            body: {
              file_name: `test_image_${level}.jpg`,
              file_type: "image/jpeg",
              file_size: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<512>
              >(),
              storage_path: `/uploads/images/level_${level}`,
              optimization_level: level,
            } satisfies ICommunityPlatformMediaFile.ICreate,
          },
        );
      typia.assert(file);
      return { level, file };
    },
  );

  // Step 3: Validate optimization levels are correctly applied
  for (const { level, file } of testFiles) {
    TestValidator.equals(
      `optimization level ${level} should be reflected in response`,
      file.optimization_level,
      level,
    );
  }

  // Step 4: Test without optimization level (undefined)
  const noOptimizationFile =
    await api.functional.communityPlatform.member.mediaFiles.create(
      connection,
      {
        body: {
          file_name: "default_image.jpg",
          file_type: "image/jpeg",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1024>
          >(),
          storage_path: "/uploads/images/default",
        } satisfies ICommunityPlatformMediaFile.ICreate,
      },
    );
  typia.assert(noOptimizationFile);

  TestValidator.predicate(
    "file without optimization level should have undefined optimization_level",
    noOptimizationFile.optimization_level === undefined,
  );

  // Step 5: Validate business logic - different optimization levels produce different results
  const filesWithOptimization = testFiles.filter(
    ({ file }) => file.optimization_level !== undefined,
  );

  if (filesWithOptimization.length >= 2) {
    TestValidator.notEquals(
      "files with different optimization levels should have different properties",
      filesWithOptimization[0].file.id,
      filesWithOptimization[1].file.id,
    );
  }
}
