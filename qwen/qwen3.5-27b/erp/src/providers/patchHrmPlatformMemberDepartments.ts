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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformDepartmentAtSummaryTransformer } from "../transformers/HrmPlatformDepartmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberDepartments(props: {
  member: MemberPayload;
  body: IHrmPlatformDepartment.IRequest;
}): Promise<IPageIHrmPlatformDepartment.ISummary> {
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findFirstOrThrow({
      where: {
        id: props.member.session_id,
        expired_at: { gt: new Date() },
      },
      select: {
        hrm_platform_organization_id: true,
      },
    });
  if (session.hrm_platform_organization_id === null) {
    throw new HttpException("Invalid session", 401);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_platform_departmentsWhereInput = {
    deleted_at: null,
    hrm_platform_organization_id: session.hrm_platform_organization_id,
    ...(props.body.search !== undefined &&
      props.body.search !== "" && {
        name: {
          contains: props.body.search,
          mode: "insensitive",
        },
      }),
    ...(props.body.description !== undefined &&
      props.body.description !== "" && {
        description: {
          contains: props.body.description,
          mode: "insensitive",
        },
      }),
    ...(props.body.parentId !== undefined && {
      parent_id: props.body.parentId === null ? null : props.body.parentId,
    }),
  };
  const sortField = props.body.sort ?? "name";
  const sortOrder = props.body.order ?? "asc";
  const orderByInput: Prisma.hrm_platform_departmentsOrderByWithRelationInput =
    {
      [sortField]: sortOrder,
    };
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
  const transformedData = await ArrayUtil.asyncMap(
    data,
    HrmPlatformDepartmentAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
