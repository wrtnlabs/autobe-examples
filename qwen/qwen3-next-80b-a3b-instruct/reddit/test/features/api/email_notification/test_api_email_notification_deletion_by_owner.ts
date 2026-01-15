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
export async function test_api_email_notification_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate member using authorization function
  // This function automatically updates memberConnection.headers internally
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Step 3: Use the member's ID (a UUID) as the queueId for the notification
  // Assumption: The system generates one notification per member upon registration,
  // and the queueId is linked to the member's ID. This is a reasonable business logic
  // assumption given the lack of a notification listing endpoint in the API.
  const queueId = memberAuth.id;
  // Step 4: Delete the notification using the member's connection and queueId
  // This will implicitly fail if the notification doesn't exist, but we assume
  // the system generates it upon registration.
  await api.functional.communityPlatform.member.email_notification_queue.erase(
    memberConnection, // The connection has been automatically updated with auth token by authorize_member_join
    { queueId },
  );
  // No need for typia.assert since the function returns void
  // Success is indicated by no exception being thrown
}
