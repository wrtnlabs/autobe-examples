import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmOrganizationMemberCollector {
  export async function collect(props: {
    body: IErpHrmOrganizationMember.ICreate;
    erpHrmOrganizations: IEntity;
    erpHrmMembers: IEntity;
    erpHrmMemberSessions: IEntity;
  }) {
    return {
      id: v4(),
      employment_type: props.body.employmentType,
      status: "active",
      position: props.body.position ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.erpHrmOrganizations.id } },
      member: { connect: { id: props.body.memberId } },
      role: { connect: { id: props.body.roleId } },
      department: props.body.departmentId
        ? { connect: { id: props.body.departmentId } }
        : undefined,
    } satisfies Prisma.erp_hrm_organization_membersCreateInput;
  }
}
