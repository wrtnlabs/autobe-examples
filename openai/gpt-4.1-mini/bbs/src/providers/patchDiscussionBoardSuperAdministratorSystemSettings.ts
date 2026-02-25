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
import { DiscussionBoardSystemSettingTransformer } from "../transformers/DiscussionBoardSystemSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdministratorSystemSettings(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardSystemSetting.IUpdate;
}): Promise<IDiscussionBoardSystemSetting> {
  const { body } = props;
  if (body.key === undefined) {
    throw new HttpException(
      "Key is required to identify the system setting.",
      400,
    );
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.discussion_board_system_settings.findUniqueOrThrow({
      where: { key: body.key },
    });
    return await tx.discussion_board_system_settings.update({
      where: { key: body.key },
      data: {
        ...(body.value !== undefined && { value: body.value }),
        ...(body.description !== undefined && {
          description: body.description,
        }),
        ...(body.deleted_at !== undefined && { deleted_at: body.deleted_at }),
        updated_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
      },
    });
  });
  return await DiscussionBoardSystemSettingTransformer.transform(updated);
}
