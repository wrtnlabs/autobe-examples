import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
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

export async function putShoppingMallAdministratorSellerSuspensionsSuspensionId(props: {
  administrator: AdministratorPayload;
  suspensionId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerSuspension.IUpdate;
}): Promise<IShoppingMallSellerSuspension> {
  const suspension =
    await MyGlobal.prisma.shopping_mall_seller_suspensions.findUnique({
      where: { id: props.suspensionId },
    });
  if (!suspension) {
    throw new HttpException("Suspension not found", 404);
  }
  const updatedAt = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_seller_suspensions.update(
    {
      where: { id: props.suspensionId },
      data: {
        ...props.body,
        updated_at: updatedAt,
      },
    },
  );
  return updated;
}
