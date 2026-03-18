import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrms_department } from "../prepare/prepare_random_hrms_department";

export async function generate_random_hrms_member_organizations_departments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmsDepartment.ICreate> | undefined;
    params: {
      organizationId: string;
    };
  },
): Promise<IHrmsDepartment> {
  const prepared: IHrmsDepartment.ICreate = prepare_random_hrms_department(
    props.body,
  );
  const result: IHrmsDepartment =
    await api.functional.hrms.member.organizations.departments.create(
      connection,
      {
        body: prepared,
        organizationId: props.params.organizationId,
      },
    );
  return result;
}
