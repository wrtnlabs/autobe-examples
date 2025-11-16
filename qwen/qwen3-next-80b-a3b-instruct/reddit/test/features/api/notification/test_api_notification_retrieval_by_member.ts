import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotification";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_notification_retrieval_by_member(
  connection: api.IConnection,
) {
  // Authenticate as a member to establish context
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Generate a random, likely non-existent notification ID
  const nonExistentId: string = typia.random<string & tags.Format<"uuid">>();

  // Verify that retrieving a non-existent notification returns 404
  await TestValidator.error(
    "retrieving a non-existent notification ID should return 404",
    async () => {
      await api.functional.communityPlatform.member.notifications.at(
        connection,
        {
          notificationId: nonExistentId,
        },
      );
    },
  );
}
