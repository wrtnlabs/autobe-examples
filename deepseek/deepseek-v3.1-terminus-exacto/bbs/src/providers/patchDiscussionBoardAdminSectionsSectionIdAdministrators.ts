import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSuperAdminAtSummaryTransformer } from "../transformers/DiscussionBoardSuperAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminSectionsSectionIdAdministrators(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSuperAdmin.IRequest;
}): Promise<IPageIDiscussionBoardSuperAdmin.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 100), 100);
  const skip = (page - 1) * limit;
  // Verify the section exists and admin has access
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: { id: props.sectionId, deleted_at: null },
  });
  const whereInput = {
    discussion_board_section_id: props.sectionId,
    deleted_at: null,
    ...(props.body.permission_level && {
      permission_level: props.body.permission_level,
    }),
    ...(props.body.assignment_date_start &&
      props.body.assignment_date_end && {
        assignment_date: {
          gte: typia.assert(props.body.assignment_date_start),
          lte: typia.assert(props.body.assignment_date_end),
        },
      }),
    ...(props.body.assignment_date_start &&
      !props.body.assignment_date_end && {
        assignment_date: {
          gte: typia.assert(props.body.assignment_date_start),
        },
      }),
    ...(!props.body.assignment_date_start &&
      props.body.assignment_date_end && {
        assignment_date: { lte: typia.assert(props.body.assignment_date_end) },
      }),
  } satisfies Prisma.discussion_board_section_administratorsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_section_administrators.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { assignment_date: "desc" },
      ...DiscussionBoardSuperAdminAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_section_administrators.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardSuperAdminAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
