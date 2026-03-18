import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrms_organization_member } from "../prepare/prepare_random_hrms_organization_member";

export async function generate_random_hrms_member_organization_members_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmsOrganizationMember.ICreate> | undefined;
  },
): Promise<IHrmsOrganizationMember> {
  const prepared: IHrmsOrganizationMember.ICreate =
    prepare_random_hrms_organization_member(props.body);
  return await api.functional.hrms.member.organization_members.create(
    connection,
    {
      body: prepared,
    },
  );
}
