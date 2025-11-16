import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotification";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_notification_delete_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a memberUser via join
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register and authenticate an adminUser via join
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. Using adminUser context, create baseline notifications for the memberUser
  const baselineNotificationBodies = ArrayUtil.repeat(2, () => {
    const categoryOptions = ["comment_reply", "moderation", "system"] as const;
    const pickedCategory = RandomGenerator.pick(categoryOptions);

    const title = RandomGenerator.paragraph({ sentences: 3 });
    const body = RandomGenerator.paragraph({ sentences: 6 });

    return {
      community_platform_memberuser_id: memberAuthorized.id,
      category: pickedCategory,
      title,
      body,
      target_type: null,
      target_id: null,
      is_read: false,
    } satisfies ICommunityPlatformNotification.ICreate;
  });

  const createdNotifications: ICommunityPlatformNotification[] = [];
  for (const requestBody of baselineNotificationBodies) {
    const created =
      await api.functional.communityPlatform.adminUser.notifications.create(
        connection,
        {
          body: requestBody,
        },
      );
    typia.assert(created);
    createdNotifications.push(created);
  }

  TestValidator.predicate(
    "at least one baseline notification must be created",
    createdNotifications.length > 0,
  );

  // 4. Switch back to memberUser context using login to ensure member auth
  const memberLoginBody = {
    identifier: memberAuthorized.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://example.com/login",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  // 5. Generate a random UUID that is extremely unlikely to collide
  const unknownNotificationId = typia.random<string & tags.Format<"uuid">>();

  // Ensure we don't accidentally pick an ID equal to one of the baseline notifications
  const collision = createdNotifications.some(
    (n) => n.id === unknownNotificationId,
  );
  const finalUnknownId = collision
    ? typia.random<string & tags.Format<"uuid">>()
    : unknownNotificationId;

  // 6. Attempt to delete the non-existent notification and expect an error
  await TestValidator.error(
    "deleting a non-existent notification should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.notifications.erase(
        connection,
        {
          notificationId: finalUnknownId,
        },
      );
    },
  );

  // 7. Verify baseline notifications are still operable by deleting one of them
  const existingNotification = createdNotifications[0];
  await api.functional.communityPlatform.memberUser.notifications.erase(
    connection,
    {
      notificationId: existingNotification.id,
    },
  );
}
