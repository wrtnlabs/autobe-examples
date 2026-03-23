import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformDepartmentAtSummaryTransformer } from "../transformers/HrmPlatformDepartmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformAdminDepartments(props: {
  admin: AdminPayload;
  body: IHrmPlatformDepartment.IRequest;
}): Promise<IPageIHrmPlatformDepartment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.search !== undefined &&
      props.body.search !== "" && {
        name: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      }),
    ...(props.body.description !== undefined &&
      props.body.description !== "" && {
        description: {
          contains: props.body.description,
          mode: "insensitive" as const,
        },
      }),
    ...(props.body.parentId !== undefined && {
      parent_id: props.body.parentId === null ? null : props.body.parentId,
    }),
  } satisfies Prisma.hrm_platform_departmentsWhereInput;
  const orderByInput = (
    props.body.sort === "name"
      ? { name: props.body.order ?? ("asc" as const) }
      : props.body.sort === "created_at"
        ? { created_at: props.body.order ?? ("asc" as const) }
        : props.body.sort === "updated_at"
          ? { updated_at: props.body.order ?? ("asc" as const) }
          : { name: "asc" as const }
  ) satisfies Prisma.hrm_platform_departmentsOrderByWithRelationInput;
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
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformDepartmentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
