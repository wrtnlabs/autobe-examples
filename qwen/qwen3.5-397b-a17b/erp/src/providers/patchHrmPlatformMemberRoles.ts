import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberRoles(props: {
  member: MemberPayload;
  body: IHrmPlatformRole.IRequest;
}): Promise<IPageIHrmPlatformRole.ISummary> {
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        organization_id: true,
      },
    });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    organization_id: employee.organization_id,
    deleted_at: null,
    ...(props.body.search !== undefined &&
      props.body.search !== "" && {
        name: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      }),
    ...(props.body.built_in !== undefined && {
      built_in: props.body.built_in,
    }),
  } satisfies Prisma.hrm_platform_rolesWhereInput;
  const data = await MyGlobal.prisma.hrm_platform_roles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      name: true,
      built_in: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.hrm_platform_roles.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map(
      (role) =>
        ({
          id: role.id,
          name: role.name,
          built_in: role.built_in,
          created_at: role.created_at.toISOString(),
        }) satisfies IHrmPlatformRole.ISummary,
    ),
  } satisfies IPageIHrmPlatformRole.ISummary;
}
