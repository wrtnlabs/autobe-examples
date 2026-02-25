import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorBannedUsersSellersSellerIdUnban(props: {
  administrator: AdministratorPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<void> {
  const banRecord = await MyGlobal.prisma.shopping_mall_banned_users.findFirst({
    where: {
      shopping_mall_seller_id: props.sellerId,
      deleted_at: null,
    },
  });
  if (banRecord === null) {
    throw new HttpException(
      "Seller not currently banned or does not exist.",
      404,
    );
  }
  await MyGlobal.prisma.shopping_mall_banned_users.delete({
    where: { id: banRecord.id },
  });
  await MyGlobal.prisma.shopping_mall_administrative_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      administrator_id: props.administrator.id,
      action_type: "unban_seller",
      target_id: props.sellerId,
      target_entity: "seller",
      action_description: "Unban a seller",
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
      updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
}
