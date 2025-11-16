import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";

export async function getShoppingMallShoppingMallChannelsChannelCodeShoppingMallChannelCategoriesId(props: {
  channelCode: string;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallChannelCategory> {
  // Requesting needed Prisma schemas for related tables to fetch code fields
  return typia.random<IShoppingMallChannelCategory>();
}
