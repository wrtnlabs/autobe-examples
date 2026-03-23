import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerEmployeeTransformer } from "../transformers/HrmTrackerEmployeeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTrackerMemberEmployees(props: {
  member: MemberPayload;
  body: IHrmTrackerEmployee.ICreate;
}): Promise<IHrmTrackerEmployee> {
  const existing = await MyGlobal.prisma.hrm_tracker_employees.findFirst({
    where: {
      organization_id: props.body.organization_id,
      user_id: props.body.user_id,
    },
  });
  if (existing) {
    throw new HttpException("Duplicate employee record", 409);
  }
  const created = await MyGlobal.prisma.hrm_tracker_employees.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      status: props.body.status,
      employment_type: props.body.employment_type,
      position: props.body.position ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.body.organization_id } },
      user: { connect: { id: props.body.user_id } },
      role: props.body.role_id
        ? { connect: { id: props.body.role_id } }
        : undefined,
      department: props.body.department_id
        ? { connect: { id: props.body.department_id } }
        : undefined,
    },
    ...HrmTrackerEmployeeTransformer.select(),
  });
  return await HrmTrackerEmployeeTransformer.transform(created);
}
