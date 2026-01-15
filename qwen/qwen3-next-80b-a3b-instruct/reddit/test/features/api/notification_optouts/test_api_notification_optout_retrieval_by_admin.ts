import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationOptouts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationOptouts";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_notification_optout_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create connection and authenticate member to create opt-out record
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(member);
  // Step 2: Create notification opt-out record for member
  const optoutRecord =
    await api.functional.communityPlatform.member.notification_optouts.at(
      memberConnection,
      {
        optoutId: member.id,
      },
    );
  typia.assert(optoutRecord);
  // Step 3: Create connection and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com",
  } satisfies ICommunityPlatformAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminData,
  });
  typia.assert(admin);
  // Step 4: Admin retrieves member's opt-out record by ID
  const retrievedOptout =
    await api.functional.communityPlatform.member.notification_optouts.at(
      adminConnection,
      {
        optoutId: optoutRecord.id,
      },
    );
  typia.assert(retrievedOptout);
  // Step 5: Verify admin retrieved correct record
  TestValidator.equals(
    "admin retrieved correct opt-out record",
    retrievedOptout.id,
    optoutRecord.id,
  );
  TestValidator.equals(
    "admin retrieved correct opted_out status",
    retrievedOptout.opted_out,
    optoutRecord.opted_out,
  );
  TestValidator.equals(
    "admin retrieved correct notes",
    retrievedOptout.notes,
    optoutRecord.notes,
  );
}
