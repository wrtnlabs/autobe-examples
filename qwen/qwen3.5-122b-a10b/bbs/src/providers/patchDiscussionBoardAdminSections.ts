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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSectionAtSummaryTransformer } from "../transformers/DiscussionBoardSectionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminSections(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSection.IRequest;
}): Promise<IPageIDiscussionBoardSection.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_sectionsWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        {
          name: {
            contains: props.body.search,
          },
        },
        {
          description: {
            contains: props.body.search,
          },
        },
      ],
    }),
    ...(props.body.name && {
      name: {
        contains: props.body.name,
      },
    }),
    ...(props.body.description !== undefined && {
      description:
        props.body.description === null
          ? null
          : {
              contains: props.body.description,
            },
    }),
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  } satisfies Prisma.discussion_board_sectionsWhereInput;
  const orderByInput: Prisma.discussion_board_sectionsOrderByWithRelationInput =
    props.body.sort_by === "name"
      ? { name: props.body.sort_order ?? "asc" }
      : props.body.sort_by === "updated_at"
        ? { updated_at: props.body.sort_order ?? "desc" }
        : { created_at: props.body.sort_order ?? "desc" };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_sections.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardSectionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_sections.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardSectionAtSummaryTransformer.transform,
    ),
  };
}
