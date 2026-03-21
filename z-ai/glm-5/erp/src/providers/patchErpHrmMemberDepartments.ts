import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmDepartmentAtSummaryTransformer } from "../transformers/ErpHrmDepartmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberDepartments(props: {
  member: MemberPayload;
  body: IErpHrmDepartment.IRequest;
}): Promise<IPageIErpHrmDepartment.ISummary> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization selected", 400);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    organization_id: session.erp_hrm_organization_id,
    deleted_at: null,
    ...(props.body.search !== undefined && {
      name: { contains: props.body.search, mode: "insensitive" as const },
    }),
    ...(props.body.parent_id !== undefined && {
      parent_id: props.body.parent_id,
    }),
  } satisfies Prisma.erp_hrm_departmentsWhereInput;
  const data = await MyGlobal.prisma.erp_hrm_departments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { name: "asc" },
    ...ErpHrmDepartmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_departments.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmDepartmentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
