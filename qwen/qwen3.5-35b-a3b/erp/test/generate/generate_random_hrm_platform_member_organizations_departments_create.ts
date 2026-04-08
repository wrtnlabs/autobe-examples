import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_department } from "../prepare/prepare_random_hrm_platform_department";

/**
 * Generate a random department within an organization for E2E testing.
 *
 * Prepares random department creation data using the prepare function, then calls
 * the creation endpoint with the organization ID. The department will be created
 * with a randomized name and optional parent department reference.
 */
export async function generate_random_hrm_platform_member_organizations_departments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformDepartment.ICreate>;
    params: {
      organizationId: string;
    };
  },
): Promise<IHrmPlatformDepartment> {
  const prepared: IHrmPlatformDepartment.ICreate =
    prepare_random_hrm_platform_department(props.body);
  const result: IHrmPlatformDepartment =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      connection,
      {
        organizationId: props.params.organizationId,
        body: prepared,
      },
    );
  return result;
}
