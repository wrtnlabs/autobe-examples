import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import { IRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAdminAtSummaryTransformer } from "../transformers/DiscussionBoardAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAdmins(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdmin.IRequest;
}): Promise<IPageIDiscussionBoardAdmin.ISummary> {
  // Verify super administrator authorization
  const adminRecord =
    await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
      where: { id: props.admin.id },
      select: { grade: true },
    });
  if (adminRecord.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  // Build pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 10, 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause from search criteria
  const whereInput: Prisma.discussion_board_adminsWhereInput = {
    deleted_at: null,
    ...(props.body.search !== undefined && {
      OR: [
        { email: { contains: props.body.search, mode: "insensitive" } },
        { display_name: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.email !== undefined && {
      email: { contains: props.body.email, mode: "insensitive" },
    }),
    ...(props.body.displayName !== undefined && {
      display_name: { contains: props.body.displayName, mode: "insensitive" },
    }),
    ...(props.body.grade !== undefined && { grade: props.body.grade }),
    ...(props.body.banned !== undefined && {
      banned_at: props.body.banned ? { not: null } : null,
    }),
    ...(props.body.createdAt !== undefined && {
      created_at: {
        ...(props.body.createdAt.from !== undefined && {
          gte: props.body.createdAt.from,
        }),
        ...(props.body.createdAt.to !== undefined && {
          lte: props.body.createdAt.to,
        }),
      },
    }),
  } satisfies Prisma.discussion_board_adminsWhereInput;
  // Query with transformer select (sequential as per requirements)
  const data = await MyGlobal.prisma.discussion_board_admins.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...DiscussionBoardAdminAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_admins.count({
    where: whereInput,
  });
  // Transform and return paginated results
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardAdminAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
