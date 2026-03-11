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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAdministratorAssignmentsByMembers(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAdministratorAssignment.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorAssignment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Verify super admin exists
  await MyGlobal.prisma.discussion_board_super_admins.findUniqueOrThrow({
    where: { id: props.superAdmin.id, deleted_at: null },
  });
  // Build WHERE conditions
  const whereInput: Prisma.discussion_board_administrator_assignmentsWhereInput =
    {
      deleted_at: null,
      ...(props.body.assignment_type && {
        assignment_type: props.body.assignment_type,
      }),
      ...(props.body.old_role && { old_role: props.body.old_role }),
      ...(props.body.new_role && { new_role: props.body.new_role }),
      ...(props.body.search &&
        props.body.search.trim() !== "" && {
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
      assignmentByMember: {
        isNot: null,
      },
    };
  // Get data - need to join with assignment_by_members
  const data =
    await MyGlobal.prisma.discussion_board_administrator_assignments.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        old_role: true,
        new_role: true,
        assignment_type: true,
        reason: true,
        created_at: true,
        assignmentByMember: {
          select: {
            id: true,
            member: {
              select: {
                id: true,
                display_name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.discussion_board_administrator_assignments.count({
      where: whereInput,
    });
  // Transform using manual mapping (no transformer available for this specific join)
  const transformedData = data.map((item) => ({
    id: item.id as string & tags.Format<"uuid">,
    old_role: item.old_role,
    new_role: item.new_role,
    assignment_type: item.assignment_type,
    reason: item.reason ?? null,
    created_at: toISOStringSafe(item.created_at) as string &
      tags.Format<"date-time">,
  })) satisfies IDiscussionBoardAdministratorAssignment.ISummary[];
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
