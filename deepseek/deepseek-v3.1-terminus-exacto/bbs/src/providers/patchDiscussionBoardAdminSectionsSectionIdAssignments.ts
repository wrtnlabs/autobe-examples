import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSectionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdministrator";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSectionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminSectionsSectionIdAssignments(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionAdministrator.IRequest;
}): Promise<IPageIDiscussionBoardSectionAdministrator.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build complex where condition without using Date type
  const whereInput: Prisma.discussion_board_section_administratorsWhereInput = {
    discussion_board_section_id: props.sectionId,
    deleted_at: null,
    ...(props.body.permission_level && {
      permission_level: props.body.permission_level,
    }),
    ...(props.body.assignment_date_start && {
      assignment_date: {
        gte: props.body.assignment_date_start,
      },
    }),
    ...(props.body.assignment_date_end && {
      assignment_date: {
        lte: props.body.assignment_date_end,
      },
    }),
  };
  // Get paginated data with relations
  const data =
    await MyGlobal.prisma.discussion_board_section_administrators.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { assignment_date: "desc" },
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            display_name: true,
            created_at: true,
          },
        },
        superAdmin: {
          select: {
            id: true,
            email: true,
            privilege_level: true,
            created_at: true,
          },
        },
      },
    });
  // Get total count
  const total =
    await MyGlobal.prisma.discussion_board_section_administrators.count({
      where: whereInput,
    });
  // Transform data to ISummary format
  const transformedData: IDiscussionBoardSectionAdministrator.ISummary[] =
    data.map((assignment) => ({
      id: assignment.id as string & tags.Format<"uuid">,
      permission_level: assignment.permission_level,
      assignment_date: toISOStringSafe(assignment.assignment_date),
      admin: assignment.admin
        ? {
            id: assignment.admin.id as string & tags.Format<"uuid">,
            email: assignment.admin.email as string & tags.Format<"email">,
            display_name: assignment.admin.display_name,
            created_at: toISOStringSafe(assignment.admin.created_at),
          }
        : null,
      superAdmin: assignment.superAdmin
        ? {
            id: assignment.superAdmin.id as string & tags.Format<"uuid">,
            email: assignment.superAdmin.email as string & tags.Format<"email">,
            privilege_level: assignment.superAdmin.privilege_level,
            created_at: toISOStringSafe(assignment.superAdmin.created_at),
          }
        : null,
    }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
