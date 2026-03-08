import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardSectionAtSummaryTransformer } from "../transformers/DiscussionBoardSectionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSections(props: {
  body: IDiscussionBoardSection.IRequest;
}): Promise<IPageIDiscussionBoardSection.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_sectionsWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.name && { name: props.body.name }),
  } satisfies Prisma.discussion_board_sectionsWhereInput;
  const orderByInput: Prisma.discussion_board_sectionsOrderByWithRelationInput =
    props.body.sort === "name"
      ? { name: props.body.order === "asc" ? "asc" : "desc" }
      : { created_at: props.body.order === "asc" ? "asc" : "desc" };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_sections.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardSectionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_sections.count({ where: whereInput }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardSectionAtSummaryTransformer.transform,
    ),
  };
}
