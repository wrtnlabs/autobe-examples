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
export async function test_api_notification_optout_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member to create an authorized session
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(memberAuth);
  // Step 2: Retrieve the notification opt-out record for the authenticated member
  // Assuming the system automatically creates a notification opt-out record during member join
  // No record creation endpoint is provided, so we cannot manually create one
  const retrievedOptout: ICommunityPlatformNotificationOptouts =
    await api.functional.communityPlatform.member.notification_optouts.at(
      memberConnection,
      {
        optoutId: memberAuth.id, // Use member's own ID to retrieve their opt-out record
      },
    );
  typia.assert(retrievedOptout);
  // Step 3: Validate the retrieved data has the expected structure
  TestValidator.equals(
    "opt-out ID matches member ID",
    retrievedOptout.id,
    memberAuth.id,
  );
  TestValidator.predicate(
    "opted_out is boolean",
    typeof retrievedOptout.opted_out === "boolean",
  );
  // Validate notes is optional string or undefined
  if (retrievedOptout.notes !== undefined) {
    TestValidator.predicate(
      "notes is string",
      typeof retrievedOptout.notes === "string",
    );
  }
}
