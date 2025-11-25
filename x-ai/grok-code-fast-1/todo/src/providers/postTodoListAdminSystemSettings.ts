import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemSetting";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postTodoListAdminSystemSettings(props: {
  admin: AdminPayload;
  body: ITodoListSystemSetting.ICreate;
}): Promise<ITodoListSystemSetting> {
  // Enforce unique key upfront
  const existing = await MyGlobal.prisma.todo_list_system_settings.findFirst({
    where: { key: props.body.key },
  });
  if (existing) {
    throw new HttpException(
      "A system setting with this key already exists.",
      409,
    );
  }

  const now = toISOStringSafe(new Date());
  let descriptionValue = undefined;
  if (Object.prototype.hasOwnProperty.call(props.body, "description")) {
    // Forward provided value: undefined, null, or string
    descriptionValue = props.body.description ?? undefined;
  }

  try {
    const created = await MyGlobal.prisma.todo_list_system_settings.create({
      data: {
        id: v4(),
        key: props.body.key,
        value: props.body.value,
        description: descriptionValue,
        version: 1,
        created_at: now,
        updated_at: now,
      },
    });
    return {
      id: created.id,
      key: created.key,
      value: created.value,
      description: created.description ?? undefined,
      version: created.version,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "A system setting with this key already exists.",
        409,
      );
    }
    throw new HttpException("Failed to create system setting.", 500);
  }
}
