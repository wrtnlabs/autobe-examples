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
import { DiscussionBoardAdminAtSummaryTransformer } from "../transformers/DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardSuperAdminAtSummaryTransformer } from "../transformers/DiscussionBoardSuperAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminHierarchy(props: {
  superAdmin: SuperadminPayload;
}): Promise<IPageIDiscussionBoardAdministratorAssignment.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Query regular administrators with created_at field
  const adminQuery = {
    where: { deleted_at: null },
    skip,
    take: limit,
    orderBy: [
      { admin_grade: "desc" as const },
      { created_at: "desc" as const },
    ],
  } satisfies Prisma.discussion_board_adminsFindManyArgs;
  const [admins, adminsTotal] = await Promise.all([
    MyGlobal.prisma.discussion_board_admins.findMany({
      ...adminQuery,
      select: {
        ...DiscussionBoardAdminAtSummaryTransformer.select().select,
        created_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_admins.count({
      where: { deleted_at: null },
    }),
  ]);
  // Query super administrators with created_at field
  const superAdminQuery = {
    where: { deleted_at: null },
    skip,
    take: limit,
    orderBy: [
      { admin_grade: "desc" as const },
      { created_at: "desc" as const },
    ],
  } satisfies Prisma.discussion_board_super_adminsFindManyArgs;
  const [superAdmins, superAdminsTotal] = await Promise.all([
    MyGlobal.prisma.discussion_board_super_admins.findMany({
      ...superAdminQuery,
      select: {
        ...DiscussionBoardSuperAdminAtSummaryTransformer.select().select,
        created_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_super_admins.count({
      where: { deleted_at: null },
    }),
  ]);
  // Transform results
  const adminAssignments = await ArrayUtil.asyncMap(admins, async (admin) => {
    const adminSummary =
      await DiscussionBoardAdminAtSummaryTransformer.transform(admin);
    return {
      id: admin.id,
      old_role: "member", // Default previous role
      new_role: "admin", // Current role
      assignment_type: "promotion", // Default assignment type
      reason: "Initial administrator assignment", // Default reason
      created_at: toISOStringSafe(admin.created_at),
    };
  });
  const superAdminAssignments = await ArrayUtil.asyncMap(
    superAdmins,
    async (superAdmin) => {
      const superAdminSummary =
        await DiscussionBoardSuperAdminAtSummaryTransformer.transform(
          superAdmin,
        );
      return {
        id: superAdmin.id,
        old_role: "admin", // Previous role of super admin
        new_role: "super_admin", // Current role
        assignment_type: "promotion", // Default assignment type
        reason: "Promotion to super administrator", // Default reason
        created_at: toISOStringSafe(superAdmin.created_at),
      };
    },
  );
  // Combine and sort all assignments
  const allAssignments = [...adminAssignments, ...superAdminAssignments];
  allAssignments.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  // Paginate combined results
  const paginatedAssignments = allAssignments.slice(skip, skip + limit);
  const totalRecords = adminsTotal + superAdminsTotal;
  return {
    data: paginatedAssignments,
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / limit),
    } satisfies IPage.IPagination,
  };
}
