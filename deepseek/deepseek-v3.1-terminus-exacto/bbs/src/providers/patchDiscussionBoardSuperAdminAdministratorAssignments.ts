import { IDiscussionBoardAdministratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorAssignment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAdministratorAssignmentAtSummaryTransformer } from "../transformers/DiscussionBoardAdministratorAssignmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAdministratorAssignments(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAdministratorAssignment.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorAssignment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.assignment_type && {
      assignment_type: props.body.assignment_type,
    }),
    ...(props.body.old_role && { old_role: props.body.old_role }),
    ...(props.body.new_role && { new_role: props.body.new_role }),
    ...(props.body.search && {
      reason: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.created_at_start && {
      created_at: {
        gte: new Date(props.body.created_at_start),
      },
    }),
    ...(props.body.created_at_end && {
      created_at: {
        lte: new Date(props.body.created_at_end),
      },
    }),
  } satisfies Prisma.discussion_board_administrator_assignmentsWhereInput;
  const orderByInput = {
    created_at: "desc" as const,
  } satisfies Prisma.discussion_board_administrator_assignmentsOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_administrator_assignments.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardAdministratorAssignmentAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_administrator_assignments.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAdministratorAssignmentAtSummaryTransformer.transform,
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
