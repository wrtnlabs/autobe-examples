import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemVersion";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSystemVersionsId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSystemVersion> {
  const record = await MyGlobal.prisma.shopping_mall_system_versions.findUnique(
    {
      where: { id: props.id },
    },
  );
  if (!record) {
    throw new HttpException("System version record not found", 404);
  }
  return {
    ...record,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
