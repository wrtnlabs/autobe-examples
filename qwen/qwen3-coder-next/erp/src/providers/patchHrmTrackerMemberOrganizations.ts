import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerOrganization";
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

export async function patchHrmTrackerMemberOrganizations(props: {
  member: MemberPayload;
  body: IHrmTrackerOrganization.IRequest;
}): Promise<IPageIHrmTrackerOrganization.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.hrm_tracker_organizationsWhereInput = {
    deleted_at: null,
    status: props.body.status,
    ...(props.body.name && {
      name: { contains: props.body.name, mode: "insensitive" },
    }),
    ...(props.body.owner_email && {
      owner_member: {
        email: { contains: props.body.owner_email, mode: "insensitive" },
      },
    }),
    ...(props.body.owner_name && {
      owner_member: {
        display_name: { contains: props.body.owner_name, mode: "insensitive" },
      },
    }),
  } satisfies Prisma.hrm_tracker_organizationsWhereInput;
  const organizationIds = await MyGlobal.prisma.hrm_tracker_employees
    .findMany({
      where: { user_id: props.member.id, deleted_at: null },
      select: { organization_id: true },
    })
    .then((rows) => rows.map((r) => r.organization_id));
  const data = await MyGlobal.prisma.hrm_tracker_organizations.findMany({
    where: { id: { in: organizationIds }, ...where },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      logo_image_uri: true,
      status: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.hrm_tracker_organizations.count({
    where: { id: { in: organizationIds }, ...where },
  });
  return {
    data: data.map((o) => ({
      id: o.id as string & tags.Format<"uuid">,
      name: o.name,
      description: o.description ?? null,
      logo_image_uri: o.logo_image_uri ?? null,
      status: o.status as "active" | "archived" | "deleted",
      created_at: toISOStringSafe(o.created_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit) || 0,
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmTrackerOrganization.ISummary;
}
