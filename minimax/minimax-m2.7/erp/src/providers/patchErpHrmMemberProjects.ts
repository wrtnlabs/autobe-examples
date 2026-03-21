import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmProjectMemberAtSummaryTransformer } from "../transformers/ErpHrmProjectMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberProjects(props: {
  member: MemberPayload;
  body: IErpHrmProjectMember.IRequest;
}): Promise<IPageIErpHrmProjectMember.ISummary> {
  // Get member's employee record to obtain organization_id
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      erp_hrm_organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  const organizationId = employee.erp_hrm_organization_id;
  // Build dynamic WHERE clause with proper date range handling
  const startDateCondition =
    props.body.start_date_from !== undefined ||
    props.body.start_date_to !== undefined
      ? {
          start_date: {
            ...(props.body.start_date_from !== undefined && {
              gte: new Date(props.body.start_date_from),
            }),
            ...(props.body.start_date_to !== undefined && {
              lte: new Date(props.body.start_date_to),
            }),
          },
        }
      : {};
  const endDateCondition =
    props.body.end_date_from !== undefined ||
    props.body.end_date_to !== undefined
      ? {
          end_date: {
            ...(props.body.end_date_from !== undefined && {
              gte: new Date(props.body.end_date_from),
            }),
            ...(props.body.end_date_to !== undefined && {
              lte: new Date(props.body.end_date_to),
            }),
          },
        }
      : {};
  const budgetCondition =
    props.body.budget_hours_min !== undefined ||
    props.body.budget_hours_max !== undefined
      ? {
          budget_hours: {
            ...(props.body.budget_hours_min !== undefined && {
              gte: props.body.budget_hours_min,
            }),
            ...(props.body.budget_hours_max !== undefined && {
              lte: props.body.budget_hours_max,
            }),
          },
        }
      : {};
  const whereInput = {
    erp_hrm_organization_id: organizationId,
    ...(props.body.name !== undefined && {
      name: {
        contains: props.body.name,
      },
    }),
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...startDateCondition,
    ...endDateCondition,
    ...budgetCondition,
  } satisfies Prisma.erp_hrm_projectsWhereInput;
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const projects = await MyGlobal.prisma.erp_hrm_projects.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ErpHrmProjectMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_projects.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    projects,
    ErpHrmProjectMemberAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
