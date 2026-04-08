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

export async function test_api_member_retrieval_success_same_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization owner member (first member)
  const ownerResult = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      avatar_uri: typia.random<string & tags.Format<"uri">>(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: "https://test.example.com",
      referrer: "https://test.example.com/join",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(ownerResult);
  // 2. Create second member (employee) - will have separate organization
  const employeeResult = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword456!",
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      avatar_uri: typia.random<string & tags.Format<"uri">>(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: "https://test.example.com",
      referrer: "https://test.example.com/join",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employeeResult);
  // 3. Re-authenticate as organization owner using the connection with updated headers
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(ownerConnection, {
    body: {
      email: ownerResult.member.email,
      password: "TestPassword123!",
    },
  });
  // 4. Retrieve employee member details as owner
  const retrievedMember = await api.functional.hrmPlatform.members.at(
    ownerConnection,
    {
      memberId: employeeResult.member.id,
    },
  );
  typia.assert(retrievedMember);
  // 5. Validate response - check key fields from retrieved member
  TestValidator.equals(
    "member id matches",
    retrievedMember.id,
    employeeResult.member.id,
  );
  TestValidator.equals(
    "member email matches",
    retrievedMember.email,
    employeeResult.member.email,
  );
  TestValidator.equals(
    "display name matches",
    retrievedMember.display_name,
    employeeResult.member.display_name,
  );
  TestValidator.equals(
    "phone number matches",
    retrievedMember.phone_number,
    employeeResult.member.phone_number,
  );
  TestValidator.equals(
    "active status matches",
    retrievedMember.is_active,
    employeeResult.member.is_active,
  );
  TestValidator.equals(
    "created at matches",
    retrievedMember.created_at,
    employeeResult.member.created_at,
  );
  TestValidator.equals(
    "updated at matches",
    retrievedMember.updated_at,
    employeeResult.member.updated_at,
  );
  TestValidator.equals(
    "deleted at matches",
    retrievedMember.deleted_at,
    employeeResult.member.deleted_at,
  );
  TestValidator.equals(
    "last login at matches",
    retrievedMember.last_login_at,
    employeeResult.member.last_login_at,
  );
  TestValidator.equals(
    "has avatar uri field",
    retrievedMember.avatar_uri,
    employeeResult.member.avatar_uri,
  );
}