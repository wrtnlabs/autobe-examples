import { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorGradeChange";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAdministratorGradeChangeAtSummaryTransformer } from "../transformers/DiscussionBoardAdministratorGradeChangeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

interface LocalAdminPayload {
  id: string & tags.Format<"uuid">;
  session_id: string & tags.Format<"uuid">;
  type: "admin";
}
export async function patchDiscussionBoardAdminAdministratorsAdministratorIdGradeChanges(props: {
  admin: LocalAdminPayload;
  administratorId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorGradeChange.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorGradeChange.ISummary> {
  // Validate administrator exists
  const administrator =
    await MyGlobal.prisma.discussion_board_admins.findUnique({
      where: { id: props.administratorId, deleted_at: null },
    });
  if (!administrator) {
    throw new HttpException("Administrator not found", 404);
  }
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.max(1, Math.min(100, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  // Build where clause with administrator_id filter and optional conditions
  const whereInput: Prisma.discussion_board_administrator_grade_changesWhereInput =
    {
      administrator_id: props.administratorId,
    };
  // Add search condition if provided
  if (props.body.search) {
    whereInput.reason = {
      contains: props.body.search,
      mode: "insensitive" as const,
    };
  }
  // Add grade filters if provided
  if (props.body.old_grade) {
    whereInput.old_grade = props.body.old_grade;
  }
  if (props.body.new_grade) {
    whereInput.new_grade = props.body.new_grade;
  }
  // Add date range filters if provided
  if (props.body.created_at_start || props.body.created_at_end) {
    whereInput.created_at = {};
    if (props.body.created_at_start) {
      whereInput.created_at.gte = new Date(props.body.created_at_start);
    }
    if (props.body.created_at_end) {
      whereInput.created_at.lte = new Date(props.body.created_at_end);
    }
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_administrator_grade_changes.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardAdministratorGradeChangeAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_administrator_grade_changes.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAdministratorGradeChangeAtSummaryTransformer.transform,
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
