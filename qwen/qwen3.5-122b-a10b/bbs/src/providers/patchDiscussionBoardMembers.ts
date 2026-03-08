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
import { DiscussionBoardMemberAtSummaryTransformer } from "../transformers/DiscussionBoardMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardMembers(props: {
  body: IDiscussionBoardMember.IRequest;
}): Promise<IPageIDiscussionBoardMember.ISummary> {
  const page = Math.max(props.body.page ?? 1, 1);
  const limit = Math.max(1, Math.min(props.body.limit ?? 20, 100));
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { display_name: { contains: props.body.search, mode: "insensitive" } },
        { email: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.display_name && {
      display_name: { contains: props.body.display_name, mode: "insensitive" },
    }),
    ...(props.body.email && {
      email: { contains: props.body.email, mode: "insensitive" },
    }),
    ...(props.body.ban_status && { ban_status: props.body.ban_status }),
  } satisfies Prisma.discussion_board_membersWhereInput;
  const sortField = props.body.sort_by ?? "created_at";
  const sortOrder = (props.body.sort_order ??
    (sortField === "display_name" ? "asc" : "desc")) as Prisma.SortOrder;
  const orderByInput = {
    ...(sortField === "display_name"
      ? { display_name: sortOrder }
      : { created_at: sortOrder }),
  } satisfies Prisma.discussion_board_membersOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_members.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...DiscussionBoardMemberAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_members.count({ where: whereInput }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardMemberAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
