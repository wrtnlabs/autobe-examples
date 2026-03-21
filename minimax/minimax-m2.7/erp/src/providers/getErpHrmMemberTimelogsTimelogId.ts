import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimelogTransformer } from "../transformers/ErpHrmTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimelog> {
  // Fetch timelog with all relations using transformer
  const timelog = await MyGlobal.prisma.erp_hrm_timelogs.findUniqueOrThrow({
    where: { id: props.timelogId },
    ...ErpHrmTimelogTransformer.select(),
  });
  // Look up member's employee record to get organization context and employee ID
  const memberEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      role: {
        select: {
          id: true,
          rolePermissions: {
            select: {
              permission: true,
            },
          },
        },
      },
    },
  });
  if (!memberEmployee) {
    throw new HttpException("Forbidden", 403);
  }
  // Check time:view_all permission
  const hasTimeViewAll = memberEmployee.role.rolePermissions.some(
    (rp) => rp.permission === "time:view_all",
  );
  if (!hasTimeViewAll) {
    // Ownership check: verify timelog belongs to current member's employee
    if (timelog.employee.id !== memberEmployee.id) {
      throw new HttpException("Forbidden", 403);
    }
  }
  return await ErpHrmTimelogTransformer.transform(timelog);
}
