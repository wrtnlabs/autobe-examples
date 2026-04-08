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

export async function getErpHrmTimeMemberDepartmentsDepartmentIdChildrenChildDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
  childDepartmentId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeDepartment> {
  const childDepartment =
    await MyGlobal.prisma.erp_hrm_time_departments.findFirstOrThrow({
      where: {
        id: props.childDepartmentId,
        parent_department_id: props.departmentId,
      },
      ...ErpHrmTimeDepartmentTransformer.select(),
    });
  return await ErpHrmTimeDepartmentTransformer.transform(childDepartment);
}
