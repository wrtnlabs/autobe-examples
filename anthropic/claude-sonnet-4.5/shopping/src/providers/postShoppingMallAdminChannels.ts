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

export async function postShoppingMallAdminChannels(props: {
  admin: AdminPayload;
  body: IShoppingMallChannel.ICreate;
}): Promise<IShoppingMallChannel> {
  const { body } = props;

  const now = toISOStringSafe(new Date());
  const channelId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.shopping_mall_channels.create({
    data: {
      id: channelId,
      channel_code: body.channel_code,
      channel_name: body.channel_name,
      description: "",
      channel_type: "platform",
      is_active: true,
      default_currency: "USD",
      default_language: "en",
      timezone: "UTC",
      commission_rate: 0.1,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    channel_code: created.channel_code,
    channel_name: created.channel_name,
  };
}
