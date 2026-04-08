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

export async function test_api_member_join_with_org_config(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member with complete organization configuration
  const joinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
    org_name: RandomGenerator.name(),
    org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
    org_description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    org_logo_uri: typia.random<string & tags.Format<"uri">>(),
    org_timezone: RandomGenerator.pick([
      "UTC",
      "Asia/Seoul",
      "America/New_York",
    ]),
    org_fiscal_month: RandomGenerator.pick([
      1, 4, 7, 10,
    ]) satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<12>,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmPlatformMember.IJoin;
  const authorized = await authorize_member_join(joinConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // 2. Validate authorization response structure
  TestValidator.equals("member id exists", authorized.id !== undefined, true);
  TestValidator.equals("email matches", authorized.email, joinInput.email);
  TestValidator.equals(
    "display_name matches",
    authorized.display_name,
    joinInput.name,
  );
  TestValidator.equals(
    "phone_number matches",
    authorized.phone_number,
    joinInput.phone_number,
  );
  TestValidator.equals(
    "avatar_uri matches",
    authorized.avatar_uri,
    joinInput.avatar_uri,
  );
  TestValidator.equals("is_active is true", authorized.is_active, true);
  TestValidator.equals(
    "created_at exists",
    typeof authorized.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at exists",
    typeof authorized.updated_at,
    "string",
  );
  // 3. Validate token structure
  typia.assert(authorized.token);
  TestValidator.equals(
    "access token exists",
    typeof authorized.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token exists",
    typeof authorized.token.refresh,
    "string",
  );
  TestValidator.equals(
    "expired_at exists",
    typeof authorized.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "refreshable_until exists",
    typeof authorized.token.refreshable_until,
    "string",
  );
  // 4. Validate member summary in response
  typia.assert(authorized.member);
  TestValidator.equals(
    "member id in summary matches",
    authorized.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "member email in summary matches",
    authorized.member.email,
    authorized.email,
  );
  TestValidator.equals(
    "member display_name matches",
    authorized.member.display_name,
    authorized.display_name,
  );
  TestValidator.equals(
    "member is_active matches",
    authorized.member.is_active,
    authorized.is_active,
  );
  // 5. Validate sessions structure
  if (authorized.sessions && authorized.sessions.length > 0) {
    const session = authorized.sessions[0];
    typia.assert(session);
    TestValidator.equals("session id exists", typeof session.id, "string");
    TestValidator.equals(
      "session ip_address exists",
      typeof session.ip_address,
      "string",
    );
    TestValidator.equals(
      "session user_agent exists",
      typeof session.user_agent,
      "string",
    );
    TestValidator.equals(
      "session created_at exists",
      typeof session.created_at,
      "string",
    );
    TestValidator.equals(
      "session expired_at exists",
      typeof session.expired_at,
      "string",
    );
    // Validate organization context in session
    if (session.organization) {
      typia.assert(session.organization);
      TestValidator.equals(
        "session organization name matches",
        session.organization.name,
        joinInput.org_name,
      );
      TestValidator.equals(
        "session organization currency matches",
        session.organization.currency,
        joinInput.org_currency,
      );
      TestValidator.equals(
        "session organization timezone matches",
        session.organization.timezone,
        joinInput.org_timezone,
      );
      TestValidator.equals(
        "session organization fiscal_start_month matches",
        session.organization.fiscal_start_month,
        joinInput.org_fiscal_month,
      );
      typia.assert(session.organization.owner);
      TestValidator.equals(
        "session organization owner id matches",
        session.organization.owner.id,
        authorized.id,
      );
    }
  }
  // 6. Validate password reset tokens structure
  if (authorized.passwordResetTokens) {
    TestValidator.equals(
      "passwordResetTokens is array",
      Array.isArray(authorized.passwordResetTokens),
      true,
    );
  }
  // 7. Validate email verifications structure
  if (authorized.emailVerifications) {
    TestValidator.equals(
      "emailVerifications is array",
      Array.isArray(authorized.emailVerifications),
      true,
    );
  }
}
