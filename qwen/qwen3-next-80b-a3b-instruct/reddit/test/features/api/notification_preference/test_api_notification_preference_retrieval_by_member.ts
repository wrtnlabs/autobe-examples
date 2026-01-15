import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserNotificationPreference";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_notification_preference_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData: ICommunityPlatformMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: memberData });
  typia.assert(member);
  // Step 2: Retrieve the member's notification preference using their member ID as the preferenceID
  // The system automatically creates a notification preference upon member join
  // The preference is linked to the member by their member ID in the backend
  const notificationPreference: ICommunityPlatformUserNotificationPreference =
    await api.functional.communityPlatform.member.notification_preferences.at(
      memberConnection, // Use the authenticated connection for this member
      {
        preferenceId: member.id, // Associate with member's ID
      },
    );
  // Step 3: Validate the response matches the expected schema structure exactly
  // USE typia.assert ONLY - it performs complete validation of all types and formats
  typia.assert(notificationPreference);
  // Step 4: Verify access control - another member cannot access this preference
  // Create a second member
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberData: ICommunityPlatformMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  const secondMember: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(secondMemberConnection, {
      body: secondMemberData,
    });
  typia.assert(secondMember);
  // Try to access first member's preference using second member's connection should fail
  await TestValidator.error(
    "member should not access another member's preference",
    async () => {
      await api.functional.communityPlatform.member.notification_preferences.at(
        secondMemberConnection, // second member's connection
        {
          preferenceId: member.id, // try to access first member's preference
        },
      );
    },
  );
}
