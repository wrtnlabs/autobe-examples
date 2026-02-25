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
import { DiscussionBoardSystemSettingTransformer } from "../transformers/DiscussionBoardSystemSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorSystemSettings(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardSystemSetting.IUpdate;
}): Promise<IDiscussionBoardSystemSetting> {
  if (!props.body.key) {
    throw new HttpException("Key is required for system setting update", 400);
  }
  const existing =
    await MyGlobal.prisma.discussion_board_system_settings.findUniqueOrThrow({
      where: { key: props.body.key },
    });
  const updated = await MyGlobal.prisma.discussion_board_system_settings.update(
    {
      where: { id: existing.id },
      data: {
        ...(props.body.key !== undefined ? { key: props.body.key } : {}),
        ...(props.body.value !== undefined ? { value: props.body.value } : {}),
        ...(props.body.description !== undefined
          ? { description: props.body.description }
          : {}),
        ...(props.body.deleted_at !== undefined
          ? { deleted_at: props.body.deleted_at }
          : {}),
        updated_at: new Date().toISOString(),
      },
      ...DiscussionBoardSystemSettingTransformer.select(),
    },
  );
  return DiscussionBoardSystemSettingTransformer.transform(updated);
}
