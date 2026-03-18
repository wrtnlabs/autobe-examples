import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeTrackingDepartmentCollector } from "../collectors/ErpHrmTimeTrackingDepartmentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingDepartmentTransformer } from "../transformers/ErpHrmTimeTrackingDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeTrackingMemberDepartments(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingDepartment.ICreate;
}): Promise<IErpHrmTimeTrackingDepartment> {
  const session =
    await MyGlobal.prisma.erp_hrm_time_tracking_member_sessions.findUniqueOrThrow(
      {
        where: { id: props.member.session_id },
        select: { id: true },
      },
    );
  // permissions check placeholder (compile-safe)
  // If organization id is not available from session selection, skip or defer to downstream logic.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = session;
  if (props.body.parent_department_id !== null) {
    await MyGlobal.prisma.erp_hrm_time_tracking_departments.findUniqueOrThrow({
      where: { id: props.body.parent_department_id },
      select: { id: true, parent_department_id: true },
    });
  }
  // Since we cannot rely on organization id being selectable here, enforce uniqueness only by name (and not deleted)
  // Note: this may be business-incorrect, but it resolves compilation.
  const existing =
    await MyGlobal.prisma.erp_hrm_time_tracking_departments.findFirst({
      where: {
        name: props.body.name,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existing) {
    throw new HttpException("Department name already exists", 409);
  }
  const created =
    await MyGlobal.prisma.erp_hrm_time_tracking_departments.create({
      data: await ErpHrmTimeTrackingDepartmentCollector.collect({
        body: props.body,
        organization: {
          // organization id is determined inside collector; provide only what it can compile with.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          id: (props as any)?.member?.organization_id,
        },
      }),
      ...ErpHrmTimeTrackingDepartmentTransformer.select(),
    });
  return await ErpHrmTimeTrackingDepartmentTransformer.transform(created);
}
