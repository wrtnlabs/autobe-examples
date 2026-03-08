import { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSystemSettingTransformer } from "../transformers/DiscussionBoardSystemSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminSystemSettings(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSystemSetting.ICreate;
}): Promise<IDiscussionBoardSystemSetting> {
  const existing =
    await MyGlobal.prisma.discussion_board_system_settings.findUnique({
      where: { key: props.body.key },
      select: { id: true },
    });
  if (existing !== null) {
    throw new HttpException("Setting key already exists", 409);
  }
  const id: string & tags.Format<"uuid"> = v4() as string & tags.Format<"uuid">;
  const now: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  const created = await MyGlobal.prisma.discussion_board_system_settings.create(
    {
      data: {
        id,
        key: props.body.key,
        value: props.body.value,
        description: props.body.description ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      } satisfies Prisma.discussion_board_system_settingsCreateInput,
      ...DiscussionBoardSystemSettingTransformer.select(),
    },
  );
  return await DiscussionBoardSystemSettingTransformer.transform(created);
}
