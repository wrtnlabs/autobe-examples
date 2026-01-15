import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationOptouts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationOptouts";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
/**
 * Test the ability to toggle notification preferences from opted-out back to
 * opted-in status.
 *
 * Every member automatically receives a notification opt-out record upon
 * registration. This test simulates the flow of a user opting out of
 * notifications (if not already) and then toggling back to opted-in. Since the
 * system creates an opt-out record automatically, we use the member's ID as the
 * optoutId (as is common in such systems).
 *
 * Steps:
 *
 * 1. Authenticate member with self-signup
 * 2. Toggle notification preference from opted-out (true) to opted-in (false)
 *    using the default optoutId matching member ID
 * 3. Verify that the status was updated correctly and optoutId remains unchanged
 */
export async function test_api_notification_optout_toggle_from_opted_out(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create actor-specific connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 2: Toggle notification preference from opted-out to opted-in
  // Using member.id as the optoutId (assuming system creates opt-out record
  // with ID matching member ID on registration)
  const updatedOptout: ICommunityPlatformNotificationOptouts =
    await api.functional.communityPlatform.member.notification_optouts.update(
      memberConnection,
      {
        optoutId: memberAuth.id,
        body: {
          optedOut: false,
        } satisfies ICommunityPlatformNotificationOptouts.IUpdate,
      },
    );
  // Step 3: Validate the updated record
  typia.assert(updatedOptout);
  TestValidator.equals(
    "optoutId should remain unchanged",
    updatedOptout.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "opted_out should be false after toggle",
    updatedOptout.opted_out,
    false,
  );
}
