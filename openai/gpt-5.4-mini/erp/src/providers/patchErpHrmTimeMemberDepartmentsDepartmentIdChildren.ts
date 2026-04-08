import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeDepartmentAtSummaryTransformer } from "../transformers/ErpHrmTimeDepartmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberDepartmentsDepartmentIdChildren(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
  body: IErpHrmTimeDepartment.IRequest;
}): Promise<IPageIErpHrmTimeDepartment.ISummary> {
  const parentDepartment =
    await MyGlobal.prisma.erp_hrm_time_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
        deleted_at: true,
      },
    });
  if (
    parentDepartment.deleted_at !== null &&
    props.body.includeDeleted !== true
  ) {
    throw new HttpException("Not Found", 404);
  }
  await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirstOrThrow({
    where: {
      erp_hrm_time_member_id: props.member.id,
      erp_hrm_time_organization_id:
        parentDepartment.erp_hrm_time_organization_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    erp_hrm_time_organization_id: parentDepartment.erp_hrm_time_organization_id,
    parent_department_id: props.departmentId,
    ...(props.body.includeDeleted === true ? {} : { deleted_at: null }),
    ...(props.body.search === undefined
      ? {}
      : {
          OR: [
            { name: { contains: props.body.search } },
            { description: { contains: props.body.search } },
          ],
        }),
  } satisfies Prisma.erp_hrm_time_departmentsWhereInput;
  const orderBy = (
    props.body.sortBy === "name"
      ? { name: props.body.sortOrder === "desc" ? "desc" : "asc" }
      : { created_at: props.body.sortOrder === "asc" ? "asc" : "desc" }
  ) satisfies Prisma.erp_hrm_time_departmentsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.erp_hrm_time_departments.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...ErpHrmTimeDepartmentAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.erp_hrm_time_departments.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: await ArrayUtil.asyncMap(data, (elem) =>
      ErpHrmTimeDepartmentAtSummaryTransformer.transform(elem),
    ),
  };
}
