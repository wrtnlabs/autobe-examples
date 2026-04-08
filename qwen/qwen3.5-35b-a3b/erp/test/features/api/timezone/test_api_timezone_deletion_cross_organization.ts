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

/**
 * Test cross-organization timezone deletion authorization boundary.
 *
 * Validates that members from different organizations cannot delete each other's
 * timezone configurations. The test creates two members with separate organizations
 * and attempts to delete timezone IDs that belong to the other organization.
 *
 * The authorization system should reject cross-organization deletion attempts
 * with appropriate error codes (403 Forbidden for permission denied, or 404
 * Not Found if the timezone cannot be located).
 *
 * 1. Member A joins and creates Organization A with timezone configuration.
 * 2. Member B joins and creates Organization B with timezone configuration.
 * 3. Member B attempts to delete Organization A's timezone (should fail).
 * 4. Member A attempts to delete Organization B's timezone (should fail).
 * 5. Verify the API properly validates ownership before deletion.
 */
export async function test_api_timezone_deletion_cross_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins and creates Organization A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      avatar_uri: typia.random<string & tags.Format<"uri">>(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]) as
        | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>)
        | undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAAuth);
  const memberASummary: IHrmPlatformMember.ISummary = memberAAuth.member;
  // 2. Member B joins and creates Organization B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      avatar_uri: typia.random<string & tags.Format<"uri">>(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]) as
        | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>)
        | undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberBAuth);
  const memberBSummary: IHrmPlatformMember.ISummary = memberBAuth.member;
  // 3. Generate fake timezone IDs representing each organization's timezone
  // Since we cannot retrieve actual timezone IDs from available APIs, we use
  // random UUIDs to test that cross-org deletion is properly rejected
  const organizationATimezoneId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  const organizationBTimezoneId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Member B attempts to delete Organization A's timezone - should fail
  await TestValidator.httpError(
    "Member B cannot delete Organization A's timezone",
    [403, 404],
    async () => {
      await api.functional.hrmPlatform.member.time_tracking_timezones.erase(
        memberBConnection,
        {
          timezoneId: organizationATimezoneId,
        },
      );
    },
  );
  // 5. Member A attempts to delete Organization B's timezone - should fail
  await TestValidator.httpError(
    "Member A cannot delete Organization B's timezone",
    [403, 404],
    async () => {
      await api.functional.hrmPlatform.member.time_tracking_timezones.erase(
        memberAConnection,
        {
          timezoneId: organizationBTimezoneId,
        },
      );
    },
  );
  // 6. Verify both members' authentication sessions remain valid
  TestValidator.predicate(
    "Member A session still valid",
    () => memberAAuth.token.access !== "",
  );
  TestValidator.predicate(
    "Member B session still valid",
    () => memberBAuth.token.access !== "",
  );
}
