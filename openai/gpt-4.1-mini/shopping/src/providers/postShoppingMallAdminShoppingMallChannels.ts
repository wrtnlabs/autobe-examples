import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminShoppingMallChannels(props: {
  admin: AdminPayload;
  body: IShoppingMallChannel.ICreate;
}): Promise<IShoppingMallChannel> {
  const now = new Date();
  const channel = await MyGlobal.prisma.shopping_mall_channels.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      code: props.body.code,
      name: props.body.name,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: channel.id,
    code: channel.code,
    name: channel.name,
    created_at: toISOStringSafe(channel.created_at) satisfies string &
      tags.Format<"date-time"> as string & tags.Format<"date-time">,
    updated_at:
      channel.updated_at === null ? null : toISOStringSafe(channel.updated_at),
  };
}
