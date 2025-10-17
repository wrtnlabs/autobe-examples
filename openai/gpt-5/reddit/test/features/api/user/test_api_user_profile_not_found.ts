import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserKarma";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";

export async function test_api_user_profile_not_found(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection (one-time creation, no further header manipulation)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Generate a random UUID that should not match any existing user
  const missingUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // In simulate mode, the SDK returns random successful data.
  // Provide a meaningful assertion path for simulate environments.
  if (connection.simulate === true) {
    const output = await api.functional.communityPlatform.users.profile.at(
      unauthConn,
      { userId: missingUserId },
    );
    typia.assert<ICommunityPlatformUserProfile>(output);
    return;
  }

  // Expect a runtime error (not-found) for a non-existent user in real environments
  await TestValidator.error(
    "requesting non-existent user profile should fail",
    async () => {
      await api.functional.communityPlatform.users.profile.at(unauthConn, {
        userId: missingUserId,
      });
    },
  );
}
