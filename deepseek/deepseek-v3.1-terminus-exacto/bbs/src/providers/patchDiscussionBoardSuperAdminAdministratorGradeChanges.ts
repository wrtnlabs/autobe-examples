import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorGradeChange";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardAdministratorGradeChangeAtSummaryTransformer } from "../transformers/DiscussionBoardAdministratorGradeChangeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAdministratorGradeChanges(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardAdministratorGradeChange.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorGradeChange.ISummary> {
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper filter handling
  const whereConditions: any = {};
  if (
    props.body.administrator_id !== undefined &&
    props.body.administrator_id !== null
  ) {
    whereConditions.administrator_id = props.body.administrator_id;
  }
  if (
    props.body.changed_by_administrator_id !== undefined &&
    props.body.changed_by_administrator_id !== null
  ) {
    whereConditions.changed_by_administrator_id =
      props.body.changed_by_administrator_id;
  }
  if (props.body.old_grade !== undefined && props.body.old_grade !== null) {
    whereConditions.old_grade = props.body.old_grade;
  }
  if (props.body.new_grade !== undefined && props.body.new_grade !== null) {
    whereConditions.new_grade = props.body.new_grade;
  }
  if (props.body.reason !== undefined && props.body.reason !== null) {
    whereConditions.reason = {
      contains: props.body.reason,
      mode: "insensitive" as const,
    };
  }
  // Handle date range filtering
  if (
    (props.body.created_at_start !== undefined &&
      props.body.created_at_start !== null) ||
    (props.body.created_at_end !== undefined &&
      props.body.created_at_end !== null)
  ) {
    whereConditions.created_at = {};
    if (
      props.body.created_at_start !== undefined &&
      props.body.created_at_start !== null
    ) {
      whereConditions.created_at.gte = props.body.created_at_start;
    }
    if (
      props.body.created_at_end !== undefined &&
      props.body.created_at_end !== null
    ) {
      whereConditions.created_at.lte = props.body.created_at_end;
    }
  }
  const whereInput =
    whereConditions satisfies Prisma.discussion_board_administrator_grade_changesWhereInput;
  // Execute queries sequentially
  const data =
    await MyGlobal.prisma.discussion_board_administrator_grade_changes.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "desc" as const },
        ...DiscussionBoardAdministratorGradeChangeAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.discussion_board_administrator_grade_changes.count({
      where: whereInput,
    });
  // Transform results using array utility
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAdministratorGradeChangeAtSummaryTransformer.transform,
  );
  // Return paginated response with correct nested pagination structure
  return {
    pagination: {
      pagination: {
        pagination: {
          pagination: {
            current: page satisfies number as number &
              tags.Type<"int32"> &
              tags.Minimum<0>,
            limit: limit satisfies number as number &
              tags.Type<"int32"> &
              tags.Minimum<0>,
            records: total satisfies number as number &
              tags.Type<"int32"> &
              tags.Minimum<0>,
            pages: Math.ceil(total / limit) satisfies number as number &
              tags.Type<"int32"> &
              tags.Minimum<0>,
          } satisfies IPage.IPagination,
        } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination,
      } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination,
    } satisfies IPageIDiscussionBoardSection.IPagination,
    data: transformedData,
  } satisfies IPageIDiscussionBoardAdministratorGradeChange.ISummary;
}
