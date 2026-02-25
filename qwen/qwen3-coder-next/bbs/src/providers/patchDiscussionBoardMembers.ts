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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardMembers(props: {
  body: IDiscussionBoardMember.IRequest;
}): Promise<IPageIDiscussionBoardMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build search conditions using trigram operations for fuzzy matching
  const searchConditions: any = {};
  if (props.body.search && props.body.search.length > 0) {
    searchConditions.OR = [
      { display_name: { contains: props.body.search, mode: "insensitive" } },
      { email: { contains: props.body.search, mode: "insensitive" } },
      { bio: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  // Build where clause with all filters
  const whereConditions: any = {
    deleted_at: null,
    ...(props.body.search && { OR: searchConditions.OR }),
    ...(props.body.isActive !== undefined && {
      is_active: props.body.isActive,
    }),
    ...(props.body.isAdmin !== undefined && {
      is_admin: props.body.isAdmin,
    }),
    ...(props.body.isSuperAdmin !== undefined && {
      is_super_admin: props.body.isSuperAdmin,
    }),
  };
  // Fetch paginated data
  const data = await MyGlobal.prisma.discussion_board_members.findMany({
    where: whereConditions,
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
  // Count total records
  const total = await MyGlobal.prisma.discussion_board_members.count({
    where: whereConditions,
  });
  // Transform to response format with proper date handling
  const transformedData: IDiscussionBoardMember.ISummary[] = data.map(
    (record) => ({
      id: record.id as string & tags.Format<"uuid">,
      email: record.email as string & tags.Format<"email">,
      display_name: record.display_name,
      bio: record.bio === null ? undefined : record.bio,
      is_active: record.is_active,
      is_admin: record.is_admin,
      is_super_admin: record.is_super_admin,
      created_at: toISOStringSafe(record.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(record.updated_at) as string &
        tags.Format<"date-time">,
    }),
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
