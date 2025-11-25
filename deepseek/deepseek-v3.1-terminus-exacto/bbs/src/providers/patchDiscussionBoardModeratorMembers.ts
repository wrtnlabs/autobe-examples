import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorMembers(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardMember.IRequest;
}): Promise<IPageIDiscussionBoardMember.ISummary> {
  const { pagination, search, filter } = props.body;

  const page = Number(pagination.current);
  const limit = Number(pagination.limit);
  const skip = (page - 1) * limit;

  // Build WHERE conditions
  const whereConditions: Record<string, unknown> = {
    deleted_at: null,
  };

  // Add search condition if provided and not just whitespace
  if (search && search.trim().length > 0) {
    whereConditions.OR = [
      { username: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { display_name: { contains: search, mode: "insensitive" } },
    ];
  }

  // Add date filter conditions if provided
  if (filter) {
    if (filter.created_after || filter.created_before) {
      whereConditions.created_at = {};

      if (filter.created_after) {
        (whereConditions.created_at as any).gte = filter.created_after;
      }

      if (filter.created_before) {
        (whereConditions.created_at as any).lte = filter.created_before;
      }
    }
  }

  // Execute concurrent queries for data and count
  const [members, totalCount] = await Promise.all([
    MyGlobal.prisma.discussion_board_members.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        username: true,
        email: true,
        display_name: true,
        bio: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_members.count({
      where: whereConditions,
    }),
  ]);

  // Convert to API response format
  const memberSummaries: IDiscussionBoardMember.ISummary[] = members.map(
    (member) => ({
      id: member.id as string & tags.Format<"uuid">,
      type: "member",
      name: member.display_name ?? member.username,
    }),
  );

  const totalRecords = Number(totalCount);
  const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / limit) : 0;

  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: totalPages,
    },
    data: memberSummaries,
  };
}
