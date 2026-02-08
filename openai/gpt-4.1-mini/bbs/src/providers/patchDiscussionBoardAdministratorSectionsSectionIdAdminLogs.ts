import { IDiscussionBoardSectionAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdminLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSectionAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionAdminLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorSectionsSectionIdAdminLogs(props: {
  administrator: AdministratorPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionAdminLog.IRequest;
}): Promise<IPageIDiscussionBoardSectionAdminLog.ISummary> {
  const section = await MyGlobal.prisma.discussion_board_sections.findFirst({
    where: { id: props.sectionId, deleted_at: null },
    select: { id: true },
  });
  if (!section) throw new HttpException("Section not found", 404);
  // Since props.body does not have page or limit, use defaults
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const logs =
    await MyGlobal.prisma.discussion_board_section_admin_logs.findMany({
      where: { section_id: props.sectionId, deleted_at: null },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        section_id: true,
        administrator_id: true,
        action_type: true,
        note: true,
        created_at: true,
      },
    });
  const total = await MyGlobal.prisma.discussion_board_section_admin_logs.count(
    {
      where: { section_id: props.sectionId, deleted_at: null },
    },
  );
  const data: IDiscussionBoardSectionAdminLog.ISummary[] = logs.map((log) => ({
    id: log.id,
    section_id: log.section_id,
    administrator_id: log.administrator_id,
    action_type: log.action_type,
    notes: log.note ?? null,
    created_at: toISOStringSafe(log.created_at),
  }));
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  };
}
