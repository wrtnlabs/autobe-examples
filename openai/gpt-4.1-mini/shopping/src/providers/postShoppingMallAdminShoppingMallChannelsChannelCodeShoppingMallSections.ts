import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminShoppingMallChannelsChannelCodeShoppingMallSections(props: {
  admin: AdminPayload;
  channelCode: string;
  body: IShoppingMallSection.ICreate;
}): Promise<IShoppingMallSection> {
  const existing = await MyGlobal.prisma.shopping_mall_sections.findFirst({
    where: {
      shopping_mall_channel_id: props.channelCode satisfies string as string,
      code: props.body.code,
      deleted_at: null,
    },
  });

  if (existing !== null) {
    throw new HttpException(
      `Section code '${props.body.code}' already exists in channel '${props.channelCode}'.`,
      409,
    );
  }

  const now = new Date();
  const created = await MyGlobal.prisma.shopping_mall_sections.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_channel_id: props.channelCode satisfies string as string,
      code: props.body.code,
      name: props.body.name,
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
      deleted_at: null,
    },
  });

  return {
    code: created.code,
    channelCode: props.channelCode,
    name: created.name,
    description: undefined,
    order: 0,
    isActive: true,
    createdAt: toISOStringSafe(now),
    updatedAt: toISOStringSafe(now),
    deletedAt: null,
  };
}
