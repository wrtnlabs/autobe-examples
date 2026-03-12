import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallGuestTransformer } from "../transformers/ShoppingMallGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallGuestsGuestId(props: {
  guestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallGuest> {
  const guest = await MyGlobal.prisma.shopping_mall_guests.findUniqueOrThrow({
    where: {
      id: props.guestId,
      deleted_at: null,
    },
    ...ShoppingMallGuestTransformer.select(),
  });
  return await ShoppingMallGuestTransformer.transform(guest);
}
