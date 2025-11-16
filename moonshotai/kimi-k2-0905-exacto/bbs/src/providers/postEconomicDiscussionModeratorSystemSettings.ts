import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSystemSetting";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postEconomicDiscussionModeratorSystemSettings(props: {
  moderator: ModeratorPayload;
  body: IEconomicDiscussionSystemSetting.ICreate;
}): Promise<IEconomicDiscussionSystemSetting> {
  // Check if setting_key already exists using findFirst with where clause
  const existing =
    await MyGlobal.prisma.economic_discussion_system_settings.findFirst({
      where: { setting_key: props.body.setting_key },
    });

  if (existing) {
    throw new HttpException("Setting key already exists", 400);
  }

  const now = new Date();
  const id = v4() as string & tags.Format<"uuid">;

  const created =
    await MyGlobal.prisma.economic_discussion_system_settings.create({
      data: {
        id,
        setting_key: props.body.setting_key,
        setting_value: props.body.setting_value,
        setting_type: props.body.setting_type,
        display_name: props.body.display_name,
        description: props.body.description,
        category: props.body.category,
        is_system_critical: props.body.is_system_critical,
        last_modified_by: props.moderator.id,
        validation_rules: props.body.validation_rules,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    setting_key: created.setting_key,
    setting_value: created.setting_value,
    setting_type: typia.assert<
      "string" | "number" | "boolean" | "json" | "datetime"
    >(created.setting_type),
    display_name: created.display_name,
    description: created.description ?? undefined,
    category: created.category,
    is_system_critical: created.is_system_critical,
    last_modified_by: created.last_modified_by ?? undefined,
    validation_rules: created.validation_rules ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
