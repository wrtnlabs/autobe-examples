import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

export async function getShoppingMallShoppingMallChannelsChannelCodeShoppingMallSectionsSectionCode(props: {
  channelCode: string;
  sectionCode: string;
}): Promise<IShoppingMallSection> {
  const record = await MyGlobal.prisma.shopping_mall_sections.findFirst({
    where: {
      shopping_mall_channel_id: props.channelCode,
      code: props.sectionCode,
    },
    select: {
      code: true,
      shopping_mall_channel_id: true,
      name: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!record) {
    throw new HttpException("Shopping mall section not found", 404);
  }

  return {
    code: record.code,
    channelCode: record.shopping_mall_channel_id satisfies string as string,
    name: record.name,
    description: undefined,
    order: 0 as number & tags.Type<"int32">,
    isActive: false,
    createdAt: toISOStringSafe(record.created_at),
    updatedAt:
      record.updated_at === null ? null : toISOStringSafe(record.updated_at),
    deletedAt:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
