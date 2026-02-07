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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAdministratorsAdministratorIdGradeChanges(props: {
  superAdmin: SuperadminPayload;
  administratorId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorGradeChange.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorGradeChange.ISummary> {
  // Verify administrator exists
  const administrator =
    await MyGlobal.prisma.discussion_board_admins.findUnique({
      where: { id: props.administratorId },
    });
  if (!administrator) {
    throw new HttpException("Administrator not found", 404);
  }
  // Build where conditions
  const whereInput: Prisma.discussion_board_administrator_grade_changesWhereInput =
    {
      administrator_id: props.administratorId,
      ...(props.body.search && { reason: { contains: props.body.search } }),
      ...(props.body.old_grade && { old_grade: props.body.old_grade }),
      ...(props.body.new_grade && { new_grade: props.body.new_grade }),
      ...(props.body.created_at_start &&
        props.body.created_at_end && {
          created_at: {
            gte: new Date(props.body.created_at_start),
            lte: new Date(props.body.created_at_end),
          },
        }),
    };
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Execute queries sequentially for better error handling
  const data =
    await MyGlobal.prisma.discussion_board_administrator_grade_changes.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          administrator: {
            select: { id: true },
          },
          changedByAdministrator: {
            select: { id: true },
          },
        },
      },
    );
  const total =
    await MyGlobal.prisma.discussion_board_administrator_grade_changes.count({
      where: whereInput,
    });
  // Transform data to ISummary format with proper date handling
  const transformedData = data.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    old_grade: record.old_grade,
    new_grade: record.new_grade,
    reason: record.reason,
    created_at: toISOStringSafe(record.created_at),
    administrator: {
      id: record.administrator.id as string & tags.Format<"uuid">,
    },
    changedByAdministrator: {
      id: record.changedByAdministrator.id as string & tags.Format<"uuid">,
    },
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
