import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeDepartmentTransformer } from "../transformers/ErpHrmTimeDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeDepartment> {
  const department =
    await MyGlobal.prisma.erp_hrm_time_departments.findUniqueOrThrow({
      where: {
        id: props.departmentId,
      },
      select: {
        organization: {
          select: {
            id: true,
          },
        },
      },
    });
  if (
    (
      props.member as {
        organization_id?: string;
      }
    ).organization_id !== department.organization.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const found =
    await MyGlobal.prisma.erp_hrm_time_departments.findUniqueOrThrow({
      where: {
        id: props.departmentId,
      },
      ...ErpHrmTimeDepartmentTransformer.select(),
    });
  return await ErpHrmTimeDepartmentTransformer.transform(found);
}
