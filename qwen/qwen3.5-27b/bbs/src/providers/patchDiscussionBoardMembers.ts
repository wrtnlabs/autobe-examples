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
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_membersWhereInput = {
    deleted_at: null,
  };
  if (props.body.search !== undefined) {
    whereInput.display_name = {
      contains: props.body.search,
    };
  }
  if (props.body.email !== undefined) {
    whereInput.email = {
      contains: props.body.email,
    };
  }
  if (props.body.banned !== undefined) {
    whereInput.banned = props.body.banned;
  }
  if (
    props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
  ) {
    whereInput.created_at = {};
    if (props.body.createdAtFrom !== undefined) {
      whereInput.created_at.gte = new Date(props.body.createdAtFrom);
    }
    if (props.body.createdAtTo !== undefined) {
      whereInput.created_at.lte = new Date(props.body.createdAtTo);
    }
  }
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput: Prisma.discussion_board_membersOrderByWithRelationInput =
    sortBy === "created_at"
      ? { created_at: sortOrder === "asc" ? "asc" : "desc" }
      : sortBy === "updated_at"
        ? { updated_at: sortOrder === "asc" ? "asc" : "desc" }
        : sortBy === "display_name"
          ? { display_name: sortOrder === "asc" ? "asc" : "desc" }
          : { created_at: "desc" };
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
  const transformed = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardMemberAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformed,
  };
}
