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

export async function putDiscussionBoardAdministratorSystemSettingsId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemSetting.IUpdate;
}): Promise<IDiscussionBoardSystemSetting> {
  await MyGlobal.prisma.discussion_board_system_settings.findUniqueOrThrow({
    where: { id: props.id },
  });
  if (props.body.key !== undefined) {
    const existing =
      await MyGlobal.prisma.discussion_board_system_settings.findUnique({
        where: { key: props.body.key },
      });
    if (existing !== null && existing.id !== props.id) {
      throw new HttpException(`Key '${props.body.key}' already exists`, 409);
    }
  }
  const now = new Date().toISOString();
  const updateData = {
    ...(props.body.key !== undefined && { key: props.body.key }),
    ...(props.body.value !== undefined && { value: props.body.value }),
    ...(Object.prototype.hasOwnProperty.call(props.body, "description") && {
      description:
        props.body.description === undefined ? null : props.body.description,
    }),
    ...(Object.prototype.hasOwnProperty.call(props.body, "deleted_at") && {
      deleted_at:
        props.body.deleted_at === undefined ? null : props.body.deleted_at,
    }),
    updated_at: now,
  };
  await MyGlobal.prisma.discussion_board_system_settings.update({
    where: { id: props.id },
    data: updateData,
  });
  const updated =
    await MyGlobal.prisma.discussion_board_system_settings.findUniqueOrThrow({
      where: { id: props.id },
      ...DiscussionBoardSystemSettingTransformer.select(),
    });
  return await DiscussionBoardSystemSettingTransformer.transform(updated);
}
