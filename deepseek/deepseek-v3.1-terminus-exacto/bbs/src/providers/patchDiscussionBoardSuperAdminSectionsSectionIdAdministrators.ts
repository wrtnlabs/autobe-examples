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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardSuperAdminAtSummaryTransformer } from "../transformers/DiscussionBoardSuperAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminSectionsSectionIdAdministrators(props: {
  superAdmin: SuperAdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSuperAdmin.IRequest;
}): Promise<IPageIDiscussionBoardSuperAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause with proper date handling - NO Date types allowed
  const whereInput = {
    discussion_board_section_id: props.sectionId,
    ...(props.body.permission_level !== undefined && {
      permission_level: props.body.permission_level,
    }),
    ...(props.body.assignment_date_start !== undefined && {
      assignment_date: { gte: props.body.assignment_date_start },
    }),
    ...(props.body.assignment_date_end !== undefined && {
      assignment_date: { lte: props.body.assignment_date_end },
    }),
  } satisfies Prisma.discussion_board_section_administratorsWhereInput;
  // Execute queries sequentially for clarity
  const data =
    await MyGlobal.prisma.discussion_board_section_administrators.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { assignment_date: "desc" },
      ...DiscussionBoardSuperAdminAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.discussion_board_section_administrators.count({
      where: whereInput,
    });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSuperAdminAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit) || 1, // Ensure at least 1 page
    } satisfies IPage.IPagination,
  };
}
