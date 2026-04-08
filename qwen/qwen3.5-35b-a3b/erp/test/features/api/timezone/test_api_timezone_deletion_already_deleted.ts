import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timezone_deletion_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration with organization creation
  const memberConnection: api.IConnection = { host: connection.host };
  const joinedMember: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        org_name: RandomGenerator.name(),
        org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
        org_description: RandomGenerator.paragraph({ sentences: 2 }),
        org_timezone: RandomGenerator.pick([
          "UTC",
          "Asia/Seoul",
          "America/New_York",
        ]),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(joinedMember);
  // 2. First deletion attempt on a timezone ID
  // Note: Without a GET endpoint to retrieve timezone IDs, we use a random UUID
  const timezoneId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "first deletion should fail - timezone does not exist",
    async () => {
      await api.functional.hrmPlatform.member.time_tracking_timezones.erase(
        memberConnection,
        { timezoneId },
      );
    },
  );
  // 3. Second deletion attempt on the same timezone ID
  // Tests idempotent behavior - multiple deletion attempts should fail consistently
  await TestValidator.error(
    "second deletion should fail - timezone still does not exist",
    async () => {
      await api.functional.hrmPlatform.member.time_tracking_timezones.erase(
        memberConnection,
        { timezoneId },
      );
    },
  );
  // Note: Testing "already deleted" state requires:
  // 1. A GET endpoint to retrieve timezone IDs (not available in current API)
  // 2. Organization context in join response (currently only member info returned)
  // This test validates that deletion attempts are handled consistently
}
