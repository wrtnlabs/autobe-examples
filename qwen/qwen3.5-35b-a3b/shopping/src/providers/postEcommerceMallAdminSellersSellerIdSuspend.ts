import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerTransformer } from "../transformers/EcommerceMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminSellersSellerIdSuspend(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IEcommerceMallSeller.ISuspend;
}): Promise<IEcommerceMallSeller> {
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: props.sellerId },
      select: { id: true, is_suspended: true },
    },
  );
  if (seller.is_suspended === true) {
    throw new HttpException("Seller is already suspended", 400);
  }
  const updatedSeller = await MyGlobal.prisma.ecommerce_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      is_suspended: true,
      updated_at: new Date(),
    },
  });
  await MyGlobal.prisma.ecommerce_mall_snapshot_audits.create({
    data: {
      id: v4(),
      record_type: "Seller" as const,
      record_id: props.sellerId,
      changes: "suspension" as const,
      old_values: JSON.stringify({ is_suspended: false }),
      new_values: JSON.stringify({ is_suspended: true }),
      changed_at: new Date(),
      changed_by: props.admin.id,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  const selected =
    await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow({
      where: { id: props.sellerId },
      ...EcommerceMallSellerTransformer.select(),
    });
  return await EcommerceMallSellerTransformer.transform(selected);
}
