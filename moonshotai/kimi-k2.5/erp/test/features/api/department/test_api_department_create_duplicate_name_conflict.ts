import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
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
import { generate_random_erp_hrm_member_departments_create } from "../../../generate/generate_random_erp_hrm_member_departments_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_department_create_duplicate_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create an existing department with name "Engineering"
  const existingDepartment =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: {
        name: "Engineering",
        description: "Original engineering department",
      },
    });
  typia.assert(existingDepartment);
  TestValidator.equals(
    "existing department name",
    existingDepartment.name,
    "Engineering",
  );
  // 4. Attempt to create duplicate with same name - should get 409 Conflict
  await TestValidator.httpError(
    "duplicate department name same case",
    409,
    async () => {
      await generate_random_erp_hrm_member_departments_create(
        memberConnection,
        {
          body: {
            name: "Engineering",
            description: "Duplicate description",
          },
        },
      );
    },
  );
  // 5. Attempt to create with lowercase variation - should get 409 (case-insensitive)
  await TestValidator.httpError(
    "duplicate department name lowercase",
    409,
    async () => {
      await generate_random_erp_hrm_member_departments_create(
        memberConnection,
        {
          body: {
            name: "engineering",
            description: "Lowercase duplicate description",
          },
        },
      );
    },
  );
  // 6. Attempt to create with uppercase variation - should get 409 (case-insensitive)
  await TestValidator.httpError(
    "duplicate department name uppercase",
    409,
    async () => {
      await generate_random_erp_hrm_member_departments_create(
        memberConnection,
        {
          body: {
            name: "ENGINEERING",
            description: "Uppercase duplicate description",
          },
        },
      );
    },
  );
}
