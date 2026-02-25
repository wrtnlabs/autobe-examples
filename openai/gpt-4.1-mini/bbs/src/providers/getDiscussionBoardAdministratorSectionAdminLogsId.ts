import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdminLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardSectionAdminLogTransformer } from "../transformers/DiscussionBoardSectionAdminLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdministratorSectionAdminLogsId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSectionAdminLog> {
  // Verify administrator is valid and not soft deleted
  const validAdministrator =
    await MyGlobal.prisma.discussion_board_administrators.findFirst({
      where: { id: props.administrator.id, deleted_at: null },
      select: { id: true },
    });
  if (!validAdministrator) {
    throw new HttpException("Forbidden", 403);
  }
  // Query the section admin log by id with related administrator and section
  const record =
    await MyGlobal.prisma.discussion_board_section_admin_logs.findUnique({
      where: { id: props.id },
      ...DiscussionBoardSectionAdminLogTransformer.select(),
    });
  if (!record) {
    throw new HttpException("Not Found", 404);
  }
  return await DiscussionBoardSectionAdminLogTransformer.transform(record);
}
