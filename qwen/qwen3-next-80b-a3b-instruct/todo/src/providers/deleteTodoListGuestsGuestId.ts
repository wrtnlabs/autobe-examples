import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";

export async function deleteTodoListGuestsGuestId(props: {
  guestId: string;
}): Promise<void> {
  throw new HttpException(
    "Method Not Allowed - Guest tracking records are system-managed and cannot be manually deleted.",
    405,
  );
}
