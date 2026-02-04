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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";

export async function postShoppingMallSuperAdminChannels(props: {
  superAdmin: SuperadminPayload;
  body: IShoppingMallChannel.ICreate;
}): Promise<IShoppingMallChannel> {
  // Create new channel with generated ID and required schema fields
  const created = await MyGlobal.prisma.shopping_mall_channels.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      name: "New Channel", // Required field from schema
      description:
        "A new top-level channel for organizing products and sellers", // Required field from schema
      default_route: "/channels/new", // Required field from schema
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Return only the id field as specified in IShoppingMallChannel interface
  return {
    id: created.id,
  };
}
