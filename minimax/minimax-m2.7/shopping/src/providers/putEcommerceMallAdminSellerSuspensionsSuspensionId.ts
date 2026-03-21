import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerSuspensionTransformer } from "../transformers/EcommerceMallSellerSuspensionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminSellerSuspensionsSuspensionId(props: {
  admin: AdminPayload;
  suspensionId: string & tags.Format<"uuid">;
  body: IEcommerceMallSellerSuspension.IUpdate;
}): Promise<IEcommerceMallSellerSuspension> {
  const suspension =
    await MyGlobal.prisma.ecommerce_mall_seller_suspensions.findUniqueOrThrow({
      where: { id: props.suspensionId },
      select: {
        id: true,
        ecommerce_mall_seller_id: true,
        restored_at: true,
      },
    });
  if (suspension.restored_at !== null) {
    throw new HttpException("Suspension has already been restored", 409);
  }
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
    where: { id: suspension.ecommerce_mall_seller_id },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  if (seller === null) {
    throw new HttpException("Seller not found", 404);
  }
  if (seller.deleted_at !== null) {
    throw new HttpException("Seller has been deleted", 404);
  }
  const updated =
    await MyGlobal.prisma.ecommerce_mall_seller_suspensions.update({
      where: { id: props.suspensionId },
      data: {
        restored_at: new Date(),
        restored_by_id: props.admin.id,
        restored_reason: props.body.restored_reason ?? null,
        updated_at: new Date(),
      },
      ...EcommerceMallSellerSuspensionTransformer.select(),
    });
  return await EcommerceMallSellerSuspensionTransformer.transform(updated);
}
