import { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardSystemSettingCollector } from "../collectors/DiscussionBoardSystemSettingCollector";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdministratorSystemSettings(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardSystemSetting.ICreate;
}): Promise<IDiscussionBoardSystemSetting> {
  const key = (props.body as any).key as string;
  const value = (props.body as any).value as string;
  const existing =
    await MyGlobal.prisma.discussion_board_system_settings.findFirst({
      where: { key, deleted_at: null },
      select: { id: true },
    });
  if (existing !== null) {
    throw new HttpException("Key already exists", 400);
  }
  const data = await DiscussionBoardSystemSettingCollector.collect({
    body: props.body,
    key,
    value,
  });
  const created = await MyGlobal.prisma.discussion_board_system_settings.create(
    {
      data: data,
    },
  );
  return {
    id: created.id,
    key: created.key,
    value: created.value,
    description: created.description === null ? undefined : created.description,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
