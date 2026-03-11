import { IDiscussionBoardAdministratorAssignmentToSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignmentToSuperAdmin";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorAssignmentToSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorAssignmentToSuperAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAdministratorAssignmentToSuperAdminAtSummaryTransformer } from "../transformers/DiscussionBoardAdministratorAssignmentToSuperAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAdministratorAssignmentsToSuperAdmins(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAdministratorAssignmentToSuperAdmin.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorAssignmentToSuperAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build administratorAssignment where conditions
  const assignmentWhere: Prisma.discussion_board_administrator_assignmentsWhereInput =
    {
      deleted_at: null, // Only non-deleted assignments
    };
  // Apply role-based filters
  if (
    props.body.assignment_type !== null &&
    props.body.assignment_type !== undefined
  ) {
    assignmentWhere.assignment_type = props.body.assignment_type;
  }
  if (props.body.old_role !== null && props.body.old_role !== undefined) {
    assignmentWhere.old_role = props.body.old_role;
  }
  if (props.body.new_role !== null && props.body.new_role !== undefined) {
    assignmentWhere.new_role = props.body.new_role;
  }
  if (props.body.reason !== null && props.body.reason !== undefined) {
    assignmentWhere.reason = { contains: props.body.reason };
  }
  // Apply date range filters
  if (
    props.body.created_at_start !== undefined &&
    props.body.created_at_end !== undefined
  ) {
    assignmentWhere.created_at = {
      gte: new Date(props.body.created_at_start),
      lte: new Date(props.body.created_at_end),
    };
  } else if (props.body.created_at_start !== undefined) {
    assignmentWhere.created_at = {
      gte: new Date(props.body.created_at_start),
    };
  } else if (props.body.created_at_end !== undefined) {
    assignmentWhere.created_at = {
      lte: new Date(props.body.created_at_end),
    };
  }
  // Build main where input
  const whereInput = {
    administratorAssignment: assignmentWhere,
  } satisfies Prisma.discussion_board_administrator_assignment_to_super_adminsWhereInput;
  // Execute queries sequentially (not parallel) as per pattern B requirements
  const data =
    await MyGlobal.prisma.discussion_board_administrator_assignment_to_super_admins.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "desc" as const },
        ...DiscussionBoardAdministratorAssignmentToSuperAdminAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.discussion_board_administrator_assignment_to_super_admins.count(
      {
        where: whereInput,
      },
    );
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAdministratorAssignmentToSuperAdminAtSummaryTransformer.transform,
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
