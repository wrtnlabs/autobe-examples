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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminBans(props: {
  admin: AdminPayload;
  body: IDiscussionBoardMember.IRequest;
}): Promise<IPageIDiscussionBoardMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause for banned users with optional filters
  const whereInput: Prisma.discussion_board_membersWhereInput = {
    is_active: false,
    ...(props.body.search && {
      OR: [
        { display_name: { contains: props.body.search, mode: "insensitive" } },
        { email: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(typeof props.body.isAdmin === "boolean" && {
      is_admin: props.body.isAdmin,
    }),
    ...(typeof props.body.isSuperAdmin === "boolean" && {
      is_super_admin: props.body.isSuperAdmin,
    }),
  };
  // Fetch paginated banned users
  const data = await MyGlobal.prisma.discussion_board_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
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
  // Fetch total count for pagination
  const total = await MyGlobal.prisma.discussion_board_members.count({
    where: whereInput,
  });
  // Transform to response format
  const transformedData: IDiscussionBoardMember.ISummary[] = data.map(
    (record) => {
      const result: IDiscussionBoardMember.ISummary = {
        id: record.id,
        email: record.email,
        display_name: record.display_name,
        bio: record.bio ?? null,
        is_active: record.is_active,
        is_admin: record.is_admin,
        is_super_admin: record.is_super_admin,
        created_at: toISOStringSafe(record.created_at),
        updated_at: toISOStringSafe(record.updated_at),
      };
      return result;
    },
  );
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return {
    pagination,
    data: transformedData,
  };
}
