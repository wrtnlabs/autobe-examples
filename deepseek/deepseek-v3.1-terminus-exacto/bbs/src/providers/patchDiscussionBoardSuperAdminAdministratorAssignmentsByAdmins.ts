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

export async function patchDiscussionBoardSuperAdminAdministratorAssignmentsByAdmins(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAdministratorAssignment.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorAssignment.ISummary> {
  // Parse pagination parameters with bounds checking
  const page = props.body.page ?? 1;
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  // Build base WHERE clause for the main assignment table
  const whereBase = {
    deleted_at: null,
    ...(props.body.assignment_type && {
      assignment_type: props.body.assignment_type,
    }),
    ...(props.body.old_role && { old_role: props.body.old_role }),
    ...(props.body.new_role && { new_role: props.body.new_role }),
    ...(props.body.search && {
      reason: { contains: props.body.search, mode: "insensitive" as const },
    }),
    ...(props.body.created_at_start && {
      created_at: { gte: props.body.created_at_start },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: props.body.created_at_end },
    }),
  } satisfies Prisma.discussion_board_administrator_assignmentsWhereInput;
  // Create complete WHERE with the admin performer requirement
  // Fix: Use proper Prisma relation filter syntax for UUID fields
  const where = {
    ...whereBase,
    // Only include assignments that have been performed by an admin (not null relation)
    performedByAdmin: { isNot: null },
  } satisfies Prisma.discussion_board_administrator_assignmentsWhereInput;
  // Execute paginated query and count
  const [assignments, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_administrator_assignments.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      // Use the transformer's select to ensure all required relations are included
      ...DiscussionBoardAdministratorAssignmentAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_administrator_assignments.count({
      where,
    }),
  ]);
  // Transform assignments to ISummary DTOs
  const transformed = await ArrayUtil.asyncMap(
    assignments,
    DiscussionBoardAdministratorAssignmentAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
