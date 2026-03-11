import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionDeletion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSectionDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionDeletion";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSectionDeletionAtSummaryTransformer } from "../transformers/DiscussionBoardSectionDeletionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminSectionsDeletions(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardSectionDeletion.IRequest;
}): Promise<IPageIDiscussionBoardSectionDeletion.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereInput: Prisma.discussion_board_section_deletionsWhereInput = {};
  // Filter by deleted_by_member_id
  if (
    props.body.deleted_by_member_id !== undefined &&
    props.body.deleted_by_member_id !== null
  ) {
    whereInput.deleted_by_member_id = props.body.deleted_by_member_id;
  }
  // Filter by created_at date range
  if (
    (props.body.created_at_start !== undefined &&
      props.body.created_at_start !== null) ||
    (props.body.created_at_end !== undefined &&
      props.body.created_at_end !== null)
  ) {
    whereInput.created_at = {};
    if (
      props.body.created_at_start !== undefined &&
      props.body.created_at_start !== null
    ) {
      whereInput.created_at.gte = new Date(props.body.created_at_start);
    }
    if (
      props.body.created_at_end !== undefined &&
      props.body.created_at_end !== null
    ) {
      whereInput.created_at.lte = new Date(props.body.created_at_end);
    }
  }
  // Query data with pagination
  const data =
    await MyGlobal.prisma.discussion_board_section_deletions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...DiscussionBoardSectionDeletionAtSummaryTransformer.select(),
    });
  // Query total count
  const total = await MyGlobal.prisma.discussion_board_section_deletions.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSectionDeletionAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
