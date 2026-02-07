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
import { DiscussionBoardAdministratorGradeChangeAtSummaryTransformer } from "../transformers/DiscussionBoardAdministratorGradeChangeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAdministratorGradeChanges(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAdministratorGradeChange.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorGradeChange.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with comprehensive filtering
  const whereInput: Prisma.discussion_board_administrator_grade_changesWhereInput =
    {
      ...(props.body.search && {
        reason: { contains: props.body.search, mode: "insensitive" },
      }),
      ...(props.body.old_grade && { old_grade: props.body.old_grade }),
      ...(props.body.new_grade && { new_grade: props.body.new_grade }),
      ...(props.body.created_at_start && {
        created_at: { gte: new Date(props.body.created_at_start) },
      }),
      ...(props.body.created_at_end && {
        created_at: { lte: new Date(props.body.created_at_end) },
      }),
    };
  // Execute queries sequentially for better error handling
  const data =
    await MyGlobal.prisma.discussion_board_administrator_grade_changes.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        ...DiscussionBoardAdministratorGradeChangeAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.discussion_board_administrator_grade_changes.count({
      where: whereInput,
    });
  // Transform results
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
    },
  };
}
