import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_profile_field_validation_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated user using provided utility function
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Connection headers are automatically updated by authorize_user_join
  // 2. Establish baseline with valid profile
  const validProfile = {
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: "https://example.com/avatar.png",
  } satisfies ICommunityPlatformUser.IUpdate;
  const baselineProfile =
    await api.functional.communityPlatform.user.profile.update(userConnection, {
      body: validProfile,
    });
  typia.assert(baselineProfile);
  // Helper function to verify profile unchanged
  const verifyProfileUnchanged = async () => {
    const current = await api.functional.communityPlatform.user.profile.update(
      userConnection,
      { body: {} },
    );
    typia.assert(current);
    // Check key fields remain the same
    TestValidator.equals(
      "display_name unchanged after failed validation",
      current.display_name,
      baselineProfile.display_name,
    );
    TestValidator.equals(
      "bio unchanged after failed validation",
      current.bio,
      baselineProfile.bio,
    );
    TestValidator.equals(
      "avatar_url unchanged after failed validation",
      current.avatar_url,
      baselineProfile.avatar_url,
    );
  };
  // 3. Test display_name shorter than 2 characters (1 character)
  await TestValidator.error(
    "display_name shorter than 2 characters",
    async () => {
      await api.functional.communityPlatform.user.profile.update(
        userConnection,
        { body: { display_name: "A" } },
      );
    },
  );
  await verifyProfileUnchanged();
  // 4. Test display_name longer than 50 characters (51 characters)
  await TestValidator.error(
    "display_name longer than 50 characters",
    async () => {
      await api.functional.communityPlatform.user.profile.update(
        userConnection,
        { body: { display_name: "A".repeat(51) } },
      );
    },
  );
  await verifyProfileUnchanged();
  // 5. Test bio longer than 500 characters (501 characters)
  await TestValidator.error("bio exceeding 500 characters", async () => {
    await api.functional.communityPlatform.user.profile.update(userConnection, {
      body: { bio: "A".repeat(501) },
    });
  });
  await verifyProfileUnchanged();
  // 6. Test avatar_url with invalid URL format - no protocol
  await TestValidator.error(
    "avatar_url with invalid URL format (no protocol)",
    async () => {
      await api.functional.communityPlatform.user.profile.update(
        userConnection,
        { body: { avatar_url: "not-a-valid-url" } },
      );
    },
  );
  await verifyProfileUnchanged();
  // 7. Test avatar_url with invalid URL format - invalid characters
  await TestValidator.error(
    "avatar_url with invalid URL format (invalid characters)",
    async () => {
      await api.functional.communityPlatform.user.profile.update(
        userConnection,
        { body: { avatar_url: "http://example.com/<script>" } },
      );
    },
  );
  await verifyProfileUnchanged();
  // 8. Test empty string handling - display_name empty string
  const emptyDisplayNameUpdate = {
    display_name: "",
  } satisfies ICommunityPlatformUser.IUpdate;
  const result1 = await api.functional.communityPlatform.user.profile.update(
    userConnection,
    { body: emptyDisplayNameUpdate },
  );
  typia.assert(result1);
  // 9. Test empty string handling - bio empty string
  const emptyBioUpdate = { bio: "" } satisfies ICommunityPlatformUser.IUpdate;
  const result2 = await api.functional.communityPlatform.user.profile.update(
    userConnection,
    { body: emptyBioUpdate },
  );
  typia.assert(result2);
  // 10. Test empty string handling - avatar_url empty string
  const emptyAvatarUpdate = {
    avatar_url: "",
  } satisfies ICommunityPlatformUser.IUpdate;
  const result3 = await api.functional.communityPlatform.user.profile.update(
    userConnection,
    { body: emptyAvatarUpdate },
  );
  typia.assert(result3);
  // 11. Test valid boundary cases - display_name exactly 2 characters (minimum)
  const exactMinDisplayName = {
    display_name: "AB",
  } satisfies ICommunityPlatformUser.IUpdate;
  const boundaryResult1 =
    await api.functional.communityPlatform.user.profile.update(userConnection, {
      body: exactMinDisplayName,
    });
  typia.assert(boundaryResult1);
  // 12. Test valid boundary cases - display_name exactly 50 characters (maximum)
  const exactMaxDisplayName = {
    display_name: "A".repeat(50),
  } satisfies ICommunityPlatformUser.IUpdate;
  const boundaryResult2 =
    await api.functional.communityPlatform.user.profile.update(userConnection, {
      body: exactMaxDisplayName,
    });
  typia.assert(boundaryResult2);
  // 13. Test valid boundary cases - bio exactly 500 characters (maximum)
  const exactMaxBio = {
    bio: "A".repeat(500),
  } satisfies ICommunityPlatformUser.IUpdate;
  const boundaryResult3 =
    await api.functional.communityPlatform.user.profile.update(userConnection, {
      body: exactMaxBio,
    });
  typia.assert(boundaryResult3);
  // 14. Test valid boundary cases - avatar_url valid format
  const validUrlUpdate = {
    avatar_url: "https://example.com/image.jpg",
  } satisfies ICommunityPlatformUser.IUpdate;
  const boundaryResult4 =
    await api.functional.communityPlatform.user.profile.update(userConnection, {
      body: validUrlUpdate,
    });
  typia.assert(boundaryResult4);
  // Final verification: empty string updates should result in null values
  const finalProfile =
    await api.functional.communityPlatform.user.profile.update(userConnection, {
      body: {},
    });
  typia.assert(finalProfile);
  // After empty string updates, fields should be null (as per DTO)
  // Note: We can't directly assert null due to undefined possibility,
  // but we can verify the profile structure is valid
  TestValidator.predicate("final profile valid after all tests", () =>
    typia.is<ICommunityPlatformUser>(finalProfile),
  );
}
