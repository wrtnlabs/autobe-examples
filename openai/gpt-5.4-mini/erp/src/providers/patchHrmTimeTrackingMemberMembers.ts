import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingMember";
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

export async function patchHrmTimeTrackingMemberMembers(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingMember.IRequest;
}): Promise<IPageIHrmTimeTrackingMember.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.hrm_time_tracking_membersWhereInput = {
    ...(props.body.search !== undefined
      ? {
          OR: [
            {
              email: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };
  const data = await MyGlobal.prisma.hrm_time_tracking_members.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      email: true,
      is_active: true,
      last_login_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const records: number = await MyGlobal.prisma.hrm_time_tracking_members.count(
    {
      where,
    },
  );
  return {
    data: data.map((item) => ({
      id: item.id,
      email: item.email,
      is_active: item.is_active,
      last_login_at:
        item.last_login_at === null ? null : item.last_login_at.toISOString(),
      created_at: item.created_at.toISOString(),
      updated_at: item.updated_at.toISOString(),
      deleted_at:
        item.deleted_at === null ? null : item.deleted_at.toISOString(),
    })),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
  };
}
