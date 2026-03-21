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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmProjectMemberAtSummaryTransformer } from "../transformers/ErpHrmProjectMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmAdminProjects(props: {
  admin: AdminPayload;
  body: IErpHrmProjectMember.IRequest;
}): Promise<IPageIErpHrmProjectMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.name !== undefined && {
      name: { contains: props.body.name, mode: "insensitive" as const },
    }),
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...(props.body.start_date_from !== undefined && {
      start_date: {
        gte: new Date(props.body.start_date_from),
        ...(props.body.start_date_to !== undefined && {
          lte: new Date(props.body.start_date_to),
        }),
      },
    }),
    ...(props.body.end_date_from !== undefined && {
      end_date: {
        gte: new Date(props.body.end_date_from),
        ...(props.body.end_date_to !== undefined && {
          lte: new Date(props.body.end_date_to),
        }),
      },
    }),
    ...(props.body.budget_hours_min !== undefined && {
      budget_hours: {
        gte: props.body.budget_hours_min,
        ...(props.body.budget_hours_max !== undefined && {
          lte: props.body.budget_hours_max,
        }),
      },
    }),
  } satisfies Prisma.erp_hrm_projectsWhereInput;
  const data = await MyGlobal.prisma.erp_hrm_projects.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ErpHrmProjectMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_projects.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmProjectMemberAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
