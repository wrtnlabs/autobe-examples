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
import { ErpHrmTimeDepartmentCollector } from "../collectors/ErpHrmTimeDepartmentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeDepartmentTransformer } from "../transformers/ErpHrmTimeDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberDepartments(props: {
  member: MemberPayload;
  body: IErpHrmTimeDepartment.ICreate;
}): Promise<IErpHrmTimeDepartment> {
  const organization =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirstOrThrow(
      {
        where: {
          erp_hrm_time_member_id: props.member.id,
          is_selected_context: true,
          deleted_at: null,
        },
        select: {
          erp_hrm_time_organization_id: true,
        },
      },
    );
  if (
    props.body.parentDepartmentId !== undefined &&
    props.body.parentDepartmentId !== null
  ) {
    const parent = await MyGlobal.prisma.erp_hrm_time_departments.findFirst({
      where: {
        id: props.body.parentDepartmentId,
        erp_hrm_time_organization_id: organization.erp_hrm_time_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        parent_department_id: true,
      },
    });
    if (parent === null) {
      throw new HttpException(
        "Parent department must belong to the selected organization",
        400,
      );
    }
    if (parent.parent_department_id !== null) {
      throw new HttpException(
        "Department hierarchy can only be one level deep",
        400,
      );
    }
  }
  try {
    const created = await MyGlobal.prisma.erp_hrm_time_departments.create({
      data: await ErpHrmTimeDepartmentCollector.collect({
        body: props.body,
        organization: {
          id: organization.erp_hrm_time_organization_id,
        },
      }),
      ...ErpHrmTimeDepartmentTransformer.select(),
    });
    return await ErpHrmTimeDepartmentTransformer.transform(created);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new HttpException(
          "Department name must be unique within the selected organization",
          409,
        );
      }
      if (error.code === "P2003") {
        throw new HttpException(
          "Parent department must belong to the selected organization",
          400,
        );
      }
    }
    throw error;
  }
}
