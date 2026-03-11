import { IDiscussionBoardAdministratorAssignmentToMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignmentToMember";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorAssignmentToMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorAssignmentToMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAdministratorAssignmentToMemberAtSummaryTransformer } from "../transformers/DiscussionBoardAdministratorAssignmentToMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAdministratorAssignmentsToMembers(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAdministratorAssignmentToMember.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorAssignmentToMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE condition
  const whereCondition = {
    ...(props.body.assignment_type !== undefined && {
      assignment: {
        assignment_type: props.body.assignment_type,
      },
    }),
    ...(props.body.old_role !== undefined && {
      assignment: {
        old_role: props.body.old_role,
      },
    }),
    ...(props.body.new_role !== undefined && {
      assignment: {
        new_role: props.body.new_role,
      },
    }),
    ...(props.body.start_date !== undefined && {
      created_at: {
        gte: new Date(props.body.start_date),
      },
    }),
    ...(props.body.end_date !== undefined && {
      created_at: {
        lte: new Date(props.body.end_date),
      },
    }),
  } satisfies Prisma.discussion_board_administrator_assignment_to_membersWhereInput;
  const whereCountCondition =
    {} satisfies Prisma.discussion_board_administrator_assignment_to_membersWhereInput;
  // Execute queries in parallel
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_administrator_assignment_to_members.findMany(
      {
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        ...DiscussionBoardAdministratorAssignmentToMemberAtSummaryTransformer.select(),
      },
    ),
    MyGlobal.prisma.discussion_board_administrator_assignment_to_members.count({
      where: whereCountCondition,
    }),
  ]);
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAdministratorAssignmentToMemberAtSummaryTransformer.transform,
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
