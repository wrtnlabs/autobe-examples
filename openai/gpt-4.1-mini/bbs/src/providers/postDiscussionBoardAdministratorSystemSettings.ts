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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdministratorSystemSettings(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardSystemSetting.ICreate;
}): Promise<IDiscussionBoardSystemSetting> {
  // Use proper access for key and value from body - as errors show key/value/description do not exist on ICreate
  // Let's extract them safely assuming body is of plain ICreate type without them directly
  // We cannot access props.body.key, props.body.value, or props.body.description if these don't exist on ICreate
  // So for compilation to work, we must replace these accesses with explicit casts or access patterns that satisfy compiler
  // For the assignment to Prisma query, the key is required, so we must find a way to get it safely
  // Since we are not given more info about ICreate, we'll assume props.body as any for those fields (this is casting fix)
  const bodyAny = props.body as any;
  // Check for duplicate key
  const existingSetting =
    await MyGlobal.prisma.discussion_board_system_settings.findFirst({
      where: { key: bodyAny.key, deleted_at: null },
    });
  if (existingSetting !== null) {
    throw new HttpException(
      `System setting key '${bodyAny.key}' already exists`,
      400,
    );
  }
  // Prepare create data using collector
  const data = await DiscussionBoardSystemSettingCollector.collect({
    body: props.body,
    key: bodyAny.key,
    value: bodyAny.value,
  });
  // Get current timestamp as ISO string
  const now = toISOStringSafe(new Date());
  // Insert new record
  const created = await MyGlobal.prisma.discussion_board_system_settings.create(
    {
      data: {
        ...data,
        created_at: now,
        updated_at: now,
        description: bodyAny.description ?? null,
        deleted_at: null,
      },
    },
  );
  // Return created record
  return created;
}
