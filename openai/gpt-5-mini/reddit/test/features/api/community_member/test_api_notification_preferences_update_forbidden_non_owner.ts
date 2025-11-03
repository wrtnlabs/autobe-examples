import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsNotificationPreference";

export async function test_api_notification_preferences_update_forbidden_non_owner(
  connection: api.IConnection,
) {
  // Create target owner account (community member who should own preferences)
  const ownerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password: "Passw0rd!",
    profile: {
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 6 }),
      avatar_uri: typia.random<string & tags.Format<"uri">>(),
    },
    session_context: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
      session_ttl_seconds: null,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const ownerAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: ownerBody,
    });
  typia.assert(ownerAuth);

  // Create requester account (the actor attempting unauthorized change)
  const requesterBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password: "Passw0rd!",
    profile: {
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 4 }),
      avatar_uri: typia.random<string & tags.Format<"uri">>(),
    },
    session_context: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
      session_ttl_seconds: null,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const requesterAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: requesterBody,
    });
  typia.assert(requesterAuth);

  // Attempt unauthorized update: requester tries to change owner's preferences
  await TestValidator.httpError(
    "non-owner cannot update another member's notification preferences",
    403,
    async () => {
      await api.functional.communityBbs.communityMember.communityMembers.notificationPreferences.update(
        connection,
        {
          username: ownerAuth.member.username,
          body: {
            push: false,
          } satisfies ICommunityBbsNotificationPreference.IUpdate,
        },
      );
    },
  );
}
