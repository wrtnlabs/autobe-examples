import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_organization_update_duplicate_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      firstName: "Test",
      lastName: "User",
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  // 2. Create first organization with name "TestCorp"
  const firstOrg = await generate_random_erp_hrm_member_organizations_create(
    memberConnection,
    {
      body: {
        name: "TestCorp",
      },
    },
  );
  typia.assert(firstOrg);
  // 3. Create second organization with name "AnotherCorp"
  const secondOrg = await generate_random_erp_hrm_member_organizations_create(
    memberConnection,
    {
      body: {
        name: "AnotherCorp",
      },
    },
  );
  typia.assert(secondOrg);
  // 4. Attempt to update second organization with duplicate name "TestCorp"
  // 5. Verify HTTP 409 Conflict status code
  await TestValidator.httpError(
    "duplicate organization name should return 409 Conflict",
    409,
    async () => {
      await api.functional.erpHrm.member.organizations.update(
        memberConnection,
        {
          organizationId: secondOrg.id,
          body: {
            name: "TestCorp",
          } satisfies IErpHrmOrganization.IUpdate,
        },
      );
    },
  );
}
