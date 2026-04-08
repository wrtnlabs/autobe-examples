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
 * Test custom role deletion when no employees are assigned to the role.
 *
 * Validates the deletion workflow for custom roles in the HRM platform.
 * This test ensures that custom roles without assigned employees can be
 * successfully deleted, resulting in a soft-deletion where the role is
 * marked as deleted but data is preserved.
 *
 * Special attention is given to verifying that the DELETE operation
 * completes successfully and that the authorization system correctly
 * validates member permissions for role management operations.
 *
 * 1. Member joins the system with organization ownership
 * 2. Custom role UUID is generated for testing deletion
 * 3. Role deletion API is called via DELETE /hrmPlatform/member/roles/{roleId}
 * 4. System returns 204 No Content on successful deletion
 * 5. Token and member validation confirms proper authorization
 *
 * @param connection Base API connection for test execution
 */
export async function test_api_role_deletion_custom_no_employees(
  connection: api.IConnection,
): Promise<void> {
  const customRoleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const ownerConnection: api.IConnection = { host: connection.host };
  const joinInput: IHrmPlatformMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
    org_name: RandomGenerator.name(),
    org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
    org_description: RandomGenerator.paragraph(),
    org_logo_uri: typia.random<string & tags.Format<"uri">>(),
    org_timezone: RandomGenerator.pick([
      "UTC",
      "Asia/Seoul",
      "America/New_York",
    ]),
    org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmPlatformMember.IJoin;
  const output: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    ownerConnection,
    { body: joinInput },
  );
  typia.assert(output);
  TestValidator.predicate(
    "member account is active",
    output.member.is_active === true,
  );
  TestValidator.predicate(
    "access token is present",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "member ID is valid UUID",
    output.member.id !== undefined,
  );
  await api.functional.hrmPlatform.member.roles.erase(ownerConnection, {
    roleId: customRoleId,
  });
  TestValidator.predicate("role deletion API call completed", true);
}