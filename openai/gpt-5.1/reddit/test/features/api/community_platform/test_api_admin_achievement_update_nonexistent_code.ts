import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformUserAchievement } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserAchievement";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";

export async function test_api_admin_achievement_update_nonexistent_code(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized = await api.functional.auth.adminUser.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Seed a profile handle and an existing achievement for that profile
  const handle: string = typia.random<string>();

  const baseAchievementCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    category: "karma",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    icon_uri: undefined,
    status: "earned",
    earned_at: new Date().toISOString(),
  } satisfies ICommunityPlatformUserAchievement.ICreate;

  const existingAchievement =
    await api.functional.communityPlatform.adminUser.profiles.achievements.create(
      connection,
      {
        handle,
        body: baseAchievementCreateBody,
      },
    );
  typia.assert<ICommunityPlatformUserAchievement>(existingAchievement);

  // 3. Attempt to update a non-existent achievement code
  const nonexistentCode = `${existingAchievement.code}-nonexistent`;

  const nonexistentUpdateBody = {
    status: "revoked",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    icon_uri: undefined,
    revoked_at: new Date().toISOString(),
  } satisfies ICommunityPlatformUserAchievement.IUpdate;

  await TestValidator.error(
    "updating a non-existent achievement code should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.profiles.achievements.update(
        connection,
        {
          handle,
          code: nonexistentCode,
          body: nonexistentUpdateBody,
        },
      );
    },
  );

  // 4. Update the existing achievement code successfully
  const successfulUpdateBody = {
    status: "earned",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    icon_uri: undefined,
    revoked_at: null,
  } satisfies ICommunityPlatformUserAchievement.IUpdate;

  const updatedAchievement =
    await api.functional.communityPlatform.adminUser.profiles.achievements.update(
      connection,
      {
        handle,
        code: existingAchievement.code,
        body: successfulUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformUserAchievement>(updatedAchievement);

  // 5. Business assertions
  // Ensure identity fields remain stable
  TestValidator.equals(
    "updated achievement should keep the same code",
    updatedAchievement.code,
    existingAchievement.code,
  );

  TestValidator.equals(
    "updated achievement should belong to the same profile id",
    updatedAchievement.profile.id,
    existingAchievement.profile.id,
  );

  TestValidator.equals(
    "updated achievement should belong to the same profile username",
    updatedAchievement.profile.username,
    existingAchievement.profile.username,
  );

  // Ensure that at least one mutable field has changed to verify update behavior
  TestValidator.notEquals(
    "title should be updated",
    updatedAchievement.title,
    existingAchievement.title,
  );

  TestValidator.notEquals(
    "description should be updated",
    updatedAchievement.description,
    existingAchievement.description,
  );

  TestValidator.notEquals(
    "status should be updated",
    updatedAchievement.status,
    existingAchievement.status,
  );
}
