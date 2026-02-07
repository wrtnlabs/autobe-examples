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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminSectionsSectionIdAssignments(props: {
  superAdmin: SuperadminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionAdministrator.IRequest;
}): Promise<IPageIDiscussionBoardSectionAdministrator.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions without using Date constructor
  const whereInput = {
    discussion_board_section_id: props.sectionId,
    deleted_at: null,
    ...(props.body.permission_level && {
      permission_level: props.body.permission_level,
    }),
    ...(props.body.assignment_date_start && {
      assignment_date: { gte: props.body.assignment_date_start },
    }),
    ...(props.body.assignment_date_end && {
      assignment_date: { lte: props.body.assignment_date_end },
    }),
  } satisfies Prisma.discussion_board_section_administratorsWhereInput;
  // Get paginated data
  const data =
    await MyGlobal.prisma.discussion_board_section_administrators.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { assignment_date: "desc" },
      select: {
        id: true,
        permission_level: true,
        assignment_date: true,
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
  // Transform data to match DTO structure
  const transformedData = data.map((item) => ({
    id: item.id as string & tags.Format<"uuid">,
    permission_level: item.permission_level,
    assignment_date: toISOStringSafe(item.assignment_date),
    admin: item.admin
      ? {
          id: item.admin.id as string & tags.Format<"uuid">,
          email: item.admin.email as string & tags.Format<"email">,
          display_name: item.admin.display_name,
          created_at: toISOStringSafe(item.admin.created_at),
        }
      : null,
    superAdmin: item.superAdmin
      ? {
          id: item.superAdmin.id as string & tags.Format<"uuid">,
          email: item.superAdmin.email as string & tags.Format<"email">,
          privilege_level: item.superAdmin.privilege_level,
          created_at: toISOStringSafe(item.superAdmin.created_at),
        }
      : null,
  }));
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
