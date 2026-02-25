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
import { DiscussionBoardSystemSettingTransformer } from "../transformers/DiscussionBoardSystemSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

function getCurrentIsoDateTime(): string &
  import("typia").tags.Format<"date-time"> {
  return new Date().toISOString();
}
export async function postDiscussionBoardSuperAdministratorSystemSettings(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardSystemSetting.ICreate;
}): Promise<IDiscussionBoardSystemSetting> {
  const now = getCurrentIsoDateTime();
  const record = await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.discussion_board_system_settings.findUnique({
      where: { key: props.body.key },
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
    if (existing === null) {
      const createInput = await DiscussionBoardSystemSettingCollector.collect({
        body: props.body,
      });
      return tx.discussion_board_system_settings.create({ data: createInput });
    } else {
      return tx.discussion_board_system_settings.update({
        where: { key: props.body.key },
        data: {
          value: props.body.value,
          description: props.body.description ?? null,
          updated_at: now,
        },
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
    }
  });
  return await DiscussionBoardSystemSettingTransformer.transform(record);
}
