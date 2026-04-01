import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeDepartmentCollector } from "../collectors/ErpHrmTimeDepartmentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeDepartmentTransformer } from "../transformers/ErpHrmTimeDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberDepartments(props: {
  member: MemberPayload;
  body: IErpHrmTimeDepartment.ICreate;
}): Promise<IErpHrmTimeDepartment> {
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirstOrThrow(
      {
        where: {
          erp_hrm_time_member_id: props.member.id,
          deleted_at: null,
          is_selected_context: true,
        },
        select: {
          erp_hrm_time_organization_id: true,
        },
      },
    );
  const hasPermission =
    await MyGlobal.prisma.erp_hrm_time_organizations.findFirst({
      where: {
        id: membership.erp_hrm_time_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (hasPermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  const parentDepartmentId = props.body.parentDepartmentId ?? null;
  if (parentDepartmentId !== null) {
    const parent =
      await MyGlobal.prisma.erp_hrm_time_departments.findFirstOrThrow({
        where: {
          id: parentDepartmentId,
          erp_hrm_time_organization_id: membership.erp_hrm_time_organization_id,
          deleted_at: null,
        },
        select: {
          parent_department_id: true,
        },
      });
    if (parent.parent_department_id !== null) {
      throw new HttpException(
        "Parent department hierarchy is limited to one level",
        400,
      );
    }
  }
  const duplicate = await MyGlobal.prisma.erp_hrm_time_departments.findFirst({
    where: {
      erp_hrm_time_organization_id: membership.erp_hrm_time_organization_id,
      name: props.body.name,
      parent_department_id: parentDepartmentId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (duplicate !== null) {
    throw new HttpException("Department already exists", 409);
  }
  const created = await MyGlobal.prisma.erp_hrm_time_departments.create({
    data: await ErpHrmTimeDepartmentCollector.collect({
      body: props.body,
      organization: { id: membership.erp_hrm_time_organization_id },
    }),
    ...ErpHrmTimeDepartmentTransformer.select(),
  });
  return await ErpHrmTimeDepartmentTransformer.transform(created);
}
