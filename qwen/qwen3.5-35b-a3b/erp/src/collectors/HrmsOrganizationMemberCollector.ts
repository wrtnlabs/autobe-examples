import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmsOrganizationMemberCollector {
  export async function collect(props: {
    body: IHrmsOrganizationMember.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.body.hrms_member_id } },
      organization: { connect: { id: props.body.hrms_organization_id } },
      organizationRole: {
        connect: { id: props.body.hrms_organization_role_id },
      },
      employees: undefined,
    } satisfies Prisma.hrms_organization_membersCreateInput;
  }
}
