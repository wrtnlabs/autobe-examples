import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformProjectAtSummaryTransformer } from "../transformers/HrmPlatformProjectAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberProjects(props: {
  member: MemberPayload;
  body: IHrmPlatformProject.IRequest;
}): Promise<IPageIHrmPlatformProject.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const membership =
    await MyGlobal.prisma.hrm_platform_organization_memberships.findFirst({
      where: {
        hrm_platform_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (!membership) {
    throw new HttpException("Member has no organization membership", 403);
  }
  const whereInput: Prisma.hrm_platform_projectsWhereInput = {
    organization_id: membership.hrm_platform_organization_id,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.search !== undefined && {
      name: { contains: props.body.search },
    }),
  } satisfies Prisma.hrm_platform_projectsWhereInput;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.hrm_platform_projects.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...HrmPlatformProjectAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_platform_projects.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmPlatformProjectAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmPlatformProject.ISummary;
}
