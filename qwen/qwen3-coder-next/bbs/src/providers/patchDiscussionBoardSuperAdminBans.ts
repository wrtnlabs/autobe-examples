import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminBans(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardMember.IRequest;
}): Promise<IPageIDiscussionBoardMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.discussion_board_membersWhereInput = {
    is_active: false,
    ...(props.body.search && {
      OR: [
        { display_name: { contains: props.body.search, mode: "insensitive" } },
        { email: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  };
  const data = await MyGlobal.prisma.discussion_board_members.findMany({
    where,
    skip,
    take: limit,
    orderBy: { updated_at: "desc" },
    select: {
      id: true,
      email: true,
      display_name: true,
      bio: true,
      is_active: true,
      is_admin: true,
      is_super_admin: true,
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_members.count({ where });
  return {
    data: data.map((member) => ({
      id: member.id as string & tags.Format<"uuid">,
      email: member.email as string & tags.Format<"email">,
      display_name: member.display_name,
      bio: member.bio === null ? undefined : member.bio,
      is_active: member.is_active,
      is_admin: member.is_admin,
      is_super_admin: member.is_super_admin,
      created_at: member.created_at.toISOString() as string &
        tags.Format<"date-time">,
      updated_at: member.updated_at.toISOString() as string &
        tags.Format<"date-time">,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
