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
  const whereInput = {
    deleted_at: null,
    ...(props.body.search !== undefined && {
      OR: [
        { display_name: { contains: props.body.search } },
        { email: { contains: props.body.search } },
      ],
    }),
    ...(props.body.ban_status !== undefined && {
      ban_status: props.body.ban_status,
    }),
    ...(props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
      ? {
          created_at: {
            ...(props.body.created_at_from !== undefined && {
              gte: new Date(props.body.created_at_from),
            }),
            ...(props.body.created_at_to !== undefined && {
              lte: new Date(props.body.created_at_to),
            }),
          },
        }
      : {}),
  } satisfies Prisma.discussion_board_membersWhereInput;
  const orderByInput = {
    created_at: (props.body.sort_order ?? "desc") as "asc" | "desc",
  } satisfies Prisma.discussion_board_membersOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_members.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...DiscussionBoardMemberAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_members.count({
      where: whereInput,
    }),
  ]);
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardMemberAtSummaryTransformer.transform,
    ),
  } satisfies IPageIDiscussionBoardMember.ISummary;
}
