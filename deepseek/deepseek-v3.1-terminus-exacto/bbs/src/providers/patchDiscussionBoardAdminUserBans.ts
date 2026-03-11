import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardUserBanAtSummaryTransformer } from "../transformers/DiscussionBoardUserBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminUserBans(props: {
  admin: AdminPayload;
  body: IDiscussionBoardUserBan.IRequest;
}): Promise<IPageIDiscussionBoardUserBan.ISummary> {
  // Authorization implicitly handled by AdminAuth decorator
  // Build filter conditions based on request body
  const whereInput: Prisma.discussion_board_user_bansWhereInput = {
    deleted_at: null, // Exclude soft-deleted records
  };
  // Create separate array for AND conditions
  const andConditions: Prisma.discussion_board_user_bansWhereInput[] = [];
  // Filter by member_id
  if (props.body.member_id !== undefined && props.body.member_id !== null) {
    andConditions.push({ member_id: props.body.member_id });
  }
  // Filter by admin_id
  if (props.body.admin_id !== undefined && props.body.admin_id !== null) {
    andConditions.push({ admin_id: props.body.admin_id });
  }
  // Filter by status
  if (props.body.status !== undefined && props.body.status !== null) {
    andConditions.push({ status: props.body.status });
  }
  // Filter by reason using trigram search (ILike with wildcards)
  if (props.body.reason !== undefined && props.body.reason !== null) {
    andConditions.push({
      reason: { contains: props.body.reason, mode: "insensitive" },
    });
  }
  // Filter by banned_at date range
  if (
    props.body.banned_at_from !== undefined &&
    props.body.banned_at_from !== null
  ) {
    andConditions.push({
      banned_at: { gte: new Date(props.body.banned_at_from) },
    });
  }
  if (
    props.body.banned_at_to !== undefined &&
    props.body.banned_at_to !== null
  ) {
    andConditions.push({
      banned_at: { lte: new Date(props.body.banned_at_to) },
    });
  }
  // Filter by expires_at date range
  if (
    props.body.expires_at_from !== undefined &&
    props.body.expires_at_from !== null
  ) {
    andConditions.push({
      expires_at: { gte: new Date(props.body.expires_at_from) },
    });
  }
  if (
    props.body.expires_at_to !== undefined &&
    props.body.expires_at_to !== null
  ) {
    andConditions.push({
      expires_at: { lte: new Date(props.body.expires_at_to) },
    });
  }
  // Filter by unbanned_at date range
  if (
    props.body.unbanned_at_from !== undefined &&
    props.body.unbanned_at_from !== null
  ) {
    andConditions.push({
      unbanned_at: { gte: new Date(props.body.unbanned_at_from) },
    });
  }
  if (
    props.body.unbanned_at_to !== undefined &&
    props.body.unbanned_at_to !== null
  ) {
    andConditions.push({
      unbanned_at: { lte: new Date(props.body.unbanned_at_to) },
    });
  }
  // Add AND conditions if any exist
  if (andConditions.length > 0) {
    whereInput.AND = andConditions;
  }
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Fetch paginated ban records with transformer's select
  const [banRecords, totalCount] = await Promise.all([
    MyGlobal.prisma.discussion_board_user_bans.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { banned_at: "desc" },
      ...DiscussionBoardUserBanAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_user_bans.count({
      where: whereInput,
    }),
  ]);
  // Transform records to DTO format
  const transformedData = await ArrayUtil.asyncMap(
    banRecords,
    DiscussionBoardUserBanAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    } satisfies IPage.IPagination,
  };
}
