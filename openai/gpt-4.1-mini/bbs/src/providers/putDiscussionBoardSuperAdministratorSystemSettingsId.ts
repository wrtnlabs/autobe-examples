import { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdministratorSystemSettingsId(props: {
  superAdministrator: SuperadministratorPayload;
  id: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemSetting.IUpdate;
}): Promise<IDiscussionBoardSystemSetting> {
  const setting =
    await MyGlobal.prisma.discussion_board_system_settings.findUnique({
      where: { id: props.id },
    });
  if (!setting) throw new HttpException("System setting not found", 404);
  if (setting.deleted_at !== null)
    throw new HttpException("System setting has been deleted", 404);
  const updated = await MyGlobal.prisma.discussion_board_system_settings.update(
    {
      where: { id: props.id },
      data: {
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );
  return updated;
}
