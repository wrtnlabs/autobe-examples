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
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const sortField = props.body.sortField ?? "created_at";
  const sortOrder =
    props.body.sortOrder ?? (sortField === "created_at" ? "desc" : "asc");
  const whereInput = {
    deleted_at: null,
    ...(props.body.displayName !== undefined && {
      display_name: {
        contains: props.body.displayName,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.banned !== undefined && { banned: props.body.banned }),
  } satisfies Prisma.discussion_board_membersWhereInput;
  const orderByInput = {
    [sortField]: sortOrder,
  } satisfies Prisma.discussion_board_membersOrderByWithRelationInput;
  const data = await MyGlobal.prisma.discussion_board_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...DiscussionBoardMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_members.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardMemberAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
