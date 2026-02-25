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

export async function deleteShoppingMallAdministratorSellerSuspensionsSellerSuspensionId(props: {
  administrator: AdministratorPayload;
  sellerSuspensionId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.shopping_mall_seller_suspensions.findUniqueOrThrow({
    where: { id: props.sellerSuspensionId },
  });
  await MyGlobal.prisma.shopping_mall_seller_suspensions.delete({
    where: { id: props.sellerSuspensionId },
  });
}
