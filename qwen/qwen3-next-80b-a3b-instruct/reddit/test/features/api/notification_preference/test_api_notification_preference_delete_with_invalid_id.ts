import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_notification_preference_delete_with_invalid_id(
  connection: api.IConnection,
) {
  // Authenticate as member to establish context for invalid deletion
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "ValidPassword123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com/home",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Attempt to delete a notification preference with an invalid preferenceId
  // This should return 404 error as the preference doesn't exist
  await TestValidator.error(
    "deletion with invalid preferenceId should fail with 404",
    async () => {
      await api.functional.communityPlatform.member.notification_preferences.erase(
        connection,
        {
          preferenceId: "invalid-uuid", // Invalid UUID format
        },
      );
    },
  );
}
