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

export async function postDiscussionBoardAdministratorSystemSettings(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardSystemSetting.ICreate;
}): Promise<IDiscussionBoardSystemSetting> {
  const now: string & tags.Format<"date-time"> = new Date().toISOString();
  const id: string & tags.Format<"uuid"> = v4();
  const dataCreate = {
    id,
    key: props.body.key,
    value: props.body.value,
    description: props.body.description ?? null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  const dataUpdate = {
    value: props.body.value,
    description: props.body.description ?? null,
    updated_at: now,
    deleted_at: null,
  };
  const setting = await MyGlobal.prisma.$transaction(async (tx) => {
    const upserted = await tx.discussion_board_system_settings.upsert({
      where: { key: props.body.key },
      create: dataCreate,
      update: dataUpdate,
    });
    const found = await tx.discussion_board_system_settings.findUniqueOrThrow({
      where: { id: upserted.id },
      select: {
        id: true,
        key: true,
        value: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    return found;
  });
  return await DiscussionBoardSystemSettingTransformer.transform(setting);
}
