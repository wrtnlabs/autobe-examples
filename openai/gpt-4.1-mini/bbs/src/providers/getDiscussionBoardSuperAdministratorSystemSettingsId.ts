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

export async function getDiscussionBoardSuperAdministratorSystemSettingsId(props: {
  superAdministrator: SuperadministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSystemSetting> {
  const record =
    await MyGlobal.prisma.discussion_board_system_settings.findUnique({
      where: { id: props.id },
    });
  if (!record) throw new HttpException("System setting not found", 404);
  return {
    id: record.id,
    key: record.key,
    value: record.value,
    description: record.description === null ? null : record.description,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
