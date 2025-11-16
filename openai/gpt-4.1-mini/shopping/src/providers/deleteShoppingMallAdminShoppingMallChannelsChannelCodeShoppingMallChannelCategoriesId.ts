import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminShoppingMallChannelsChannelCodeShoppingMallChannelCategoriesId(props: {
  admin: AdminPayload;
  channelCode: string;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  // Remove channelCode from 'where' clause since it's invalid
  const category =
    await MyGlobal.prisma.shopping_mall_channel_categories.findFirst({
      where: {
        id: props.id,
      },
    });

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_channel_categories.delete({
    where: {
      id: props.id,
    },
  });
}
