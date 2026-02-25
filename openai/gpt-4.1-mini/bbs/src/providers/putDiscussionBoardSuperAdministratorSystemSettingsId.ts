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

export async function putDiscussionBoardSuperAdministratorSystemSettingsId(props: {
  superAdministrator: SuperadministratorPayload;
  id: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemSetting.IUpdate;
}): Promise<IDiscussionBoardSystemSetting> {
  // Locate existing setting or throw 404
  const existingSetting =
    await MyGlobal.prisma.discussion_board_system_settings.findUniqueOrThrow({
      where: { id: props.id, deleted_at: null },
    });
  // If key is updated and changed, check uniqueness
  if (
    typeof props.body.key === "string" &&
    props.body.key !== existingSetting.key
  ) {
    const keyConflict =
      await MyGlobal.prisma.discussion_board_system_settings.findUnique({
        where: { key: props.body.key },
      });
    if (keyConflict !== null && keyConflict.id !== props.id) {
      throw new HttpException(
        `System setting key '${props.body.key}' already exists`,
        409,
      );
    }
  }
  // Prepare updated timestamp as string & tags.Format<'date-time'>
  const updatedAt: string & tags.Format<"date-time"> = new Date().toISOString();
  // Build update data immutably
  const updateData: {
    key?: string;
    value?: string;
    description?: string | null;
    deleted_at?: string | null;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: updatedAt,
    ...(typeof props.body.key === "string" && { key: props.body.key }),
    ...(typeof props.body.value === "string" && { value: props.body.value }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.deleted_at !== undefined && {
      deleted_at: props.body.deleted_at,
    }),
  };
  // Update the record
  const updatedRecord =
    await MyGlobal.prisma.discussion_board_system_settings.update({
      where: { id: props.id },
      data: updateData,
    });
  // Transform and return
  return await DiscussionBoardSystemSettingTransformer.transform(updatedRecord);
}
