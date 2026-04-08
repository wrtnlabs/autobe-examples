import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformDepartmentsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartmentsSnapshot";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_departments_snapshot } from "../prepare/prepare_random_hrm_platform_departments_snapshot";

export async function generate_random_hrm_platform_member_organizations_departments_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformDepartmentsSnapshot.ICreate>;
    params: {
      organizationId: string;
      departmentId: string;
    };
  },
): Promise<IHrmPlatformDepartmentsSnapshot> {
  const prepared: IHrmPlatformDepartmentsSnapshot.ICreate =
    prepare_random_hrm_platform_departments_snapshot(props.body);
  const result: IHrmPlatformDepartmentsSnapshot =
    await api.functional.hrmPlatform.member.organizations.departments.snapshots.create(
      connection,
      {
        organizationId: props.params.organizationId,
        departmentId: props.params.departmentId,
        body: prepared,
      },
    );
  return result;
}
