import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_notification_event_deletion_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Generate a valid UUID for notification event deletion
  const eventId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Test deletion of notification event with valid authentication and valid UUID
  // This validates that:
  // - Authentication is properly handled
  // - The delete endpoint accepts valid UUID format
  // - The API call succeeds without error
  // Note: Since no API exists to create or retrieve notifications, we cannot verify
  //       the notification actually existed, but we can validate the delete endpoint with valid input
  await api.functional.communityPlatform.member.notification_events.erase(
    memberConnection,
    {
      eventId,
    },
  );
  // We cannot verify deletion success since the API returns void and no read/list endpoints exist
  // This test validates the core functionality: authenticated delete with valid event ID
}
