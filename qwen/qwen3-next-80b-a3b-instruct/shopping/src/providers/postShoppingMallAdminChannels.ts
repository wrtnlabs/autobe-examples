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
import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminChannels(props: {
  admin: AdminPayload;
  body: IShoppingMallChannel.ICreate;
}): Promise<IShoppingMallChannel> {
  const created = await MyGlobal.prisma.shopping_mall_channels.create({
    data: {
      id: v4(),
      name: "New Channel",
      description: "A new shopping mall channel",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      default_route: "/channels/default",
    },
  });
  return {
    id: created.id,
  };
}
