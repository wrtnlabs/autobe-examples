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
export async function test_api_notification_optout_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member to establish identity
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
  typia.assert(memberAuth);
  // Step 2: Create notification opt-out record for the member (connect using member connection)
  const optout: ICommunityPlatformNotificationOptouts =
    await api.functional.communityPlatform.member.notification_optouts.update(
      memberConnection,
      {
        optoutId: memberAuth.id,
        body: {
          optedOut: false,
        } satisfies ICommunityPlatformNotificationOptouts.IUpdate,
      },
    );
  typia.assert(optout);
  TestValidator.equals("opt-out record created", optout.opted_out, false);
  // Step 3: Update notification opt-out status from false to true
  const updatedOptout: ICommunityPlatformNotificationOptouts =
    await api.functional.communityPlatform.member.notification_optouts.update(
      memberConnection,
      {
        optoutId: optout.id,
        body: {
          optedOut: true,
        } satisfies ICommunityPlatformNotificationOptouts.IUpdate,
      },
    );
  typia.assert(updatedOptout);
  // Step 4: Validate that update was successful and response is correct
  TestValidator.equals(
    "opt-out status updated to true",
    updatedOptout.opted_out,
    true,
  );
  TestValidator.equals(
    "opt-out record ID preserved",
    updatedOptout.id,
    optout.id,
  );
  TestValidator.predicate(
    "notes is optional and undefined",
    () => updatedOptout.notes === undefined,
  );
}
