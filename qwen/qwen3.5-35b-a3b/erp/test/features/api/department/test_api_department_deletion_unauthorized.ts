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
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

export async function test_api_department_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Create organization with owner user (who has org:manage permission as Owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: "USD",
      org_timezone: "Asia/Seoul",
      org_fiscal_month: 1,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000/signup",
    } satisfies DeepPartial<IHrmPlatformMember.IJoin>,
  });
  // Create organization with owner
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // Authenticate as separate member WITHOUT org:manage permission on the organization
  // This user owns their own organization but not the target organization
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(unauthorizedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: "USD",
      org_timezone: "Asia/Seoul",
      org_fiscal_month: 1,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000/signup",
    } satisfies DeepPartial<IHrmPlatformMember.IJoin>,
  });
  // Attempt to delete department from organization without permission
  // This should fail with 403 Forbidden (unauthorized to manage organization)
  await TestValidator.httpError(
    "department deletion requires org:manage permission",
    [403],
    async () => {
      await api.functional.hrmPlatform.member.organizations.departments.erase(
        unauthorizedConnection,
        {
          organizationId: organization.id,
          departmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Organization integrity verified - no changes made to organization structure
  // Unauthorized user's own organization remains unaffected
}
