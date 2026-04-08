import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformDepartmentAtSummaryTransformer } from "../transformers/HrmPlatformDepartmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberOrganizationsOrganizationIdDepartments(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmPlatformDepartment.IRequest;
}): Promise<IPageIHrmPlatformDepartment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    hrm_platform_organization_id: props.organizationId,
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search } },
        { description: { contains: props.body.search } },
      ],
    }),
    ...(props.body.name && { name: { contains: props.body.name } }),
    ...(props.body.description !== undefined && {
      description:
        props.body.description === null
          ? { equals: null }
          : { contains: props.body.description },
    }),
    ...(props.body.parentDepartmentId !== undefined && {
      parent_department_id:
        props.body.parentDepartmentId === null
          ? { equals: null }
          : { equals: props.body.parentDepartmentId },
    }),
  } satisfies Prisma.hrm_platform_departmentsWhereInput;
  const orderByInput = {
    name: "asc" as const,
  } satisfies Prisma.hrm_platform_departmentsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.hrm_platform_departments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformDepartmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_departments.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await HrmPlatformDepartmentAtSummaryTransformer.transformAll(data),
  };
}
