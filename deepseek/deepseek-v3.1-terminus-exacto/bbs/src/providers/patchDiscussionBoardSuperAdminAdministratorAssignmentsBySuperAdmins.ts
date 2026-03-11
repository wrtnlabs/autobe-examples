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

export async function patchDiscussionBoardSuperAdminAdministratorAssignmentsBySuperAdmins(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAdministratorAssignment.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorAssignment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    assignerSuperAdmin: {
      isNot: null,
    },
    ...(props.body.assignment_type !== undefined && {
      assignment_type: props.body.assignment_type,
    }),
    ...(props.body.old_role !== undefined && { old_role: props.body.old_role }),
    ...(props.body.new_role !== undefined && { new_role: props.body.new_role }),
    ...(props.body.search !== undefined &&
      props.body.search.trim() !== "" && {
        reason: { contains: props.body.search, mode: "insensitive" as const },
      }),
    ...(props.body.created_at_start !== undefined &&
      props.body.created_at_start !== null && {
        created_at: { gte: new Date(props.body.created_at_start) },
      }),
    ...(props.body.created_at_end !== undefined &&
      props.body.created_at_end !== null && {
        created_at: { lte: new Date(props.body.created_at_end) },
      }),
  } satisfies Prisma.discussion_board_administrator_assignmentsWhereInput;
  // Fetch paginated data
  const data =
    await MyGlobal.prisma.discussion_board_administrator_assignments.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...DiscussionBoardAdministratorAssignmentAtSummaryTransformer.select(),
    });
  // Total count with same filters
  const total =
    await MyGlobal.prisma.discussion_board_administrator_assignments.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardAdministratorAssignmentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
