import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrms_organization_role } from "../prepare/prepare_random_hrms_organization_role";

export async function generate_random_hrms_member_organizations_roles_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmsOrganizationRole.ICreate> | undefined;
    params?: {
      organizationId: string;
    };
  },
): Promise<IHrmsOrganizationRole> {
  const prepared: IHrmsOrganizationRole.ICreate =
    prepare_random_hrms_organization_role(props.body);
  return await api.functional.hrms.member.organizations.roles.create(
    connection,
    {
      body: prepared,
      organizationId: props.params?.organizationId ?? globalThis.crypto.randomUUID(),
    },
  );
}