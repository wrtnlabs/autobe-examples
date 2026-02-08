import { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function putDiscussionBoardAdministratorSystemSettingsId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemSetting.IUpdate;
}): Promise<IDiscussionBoardSystemSetting> {
  const record =
    await MyGlobal.prisma.discussion_board_system_settings.findUnique({
      where: { id: props.id },
    });
  if (record === null) {
    throw new HttpException("System setting not found", 404);
  }
  if (record.deleted_at !== null) {
    throw new HttpException("Cannot update deleted system setting", 400);
  }
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.discussion_board_system_settings.update({
    where: { id: props.id },
    data: { updated_at: now },
  });
  // Return empty object as IDiscussionBoardSystemSetting has no defined properties
  return {};
}
