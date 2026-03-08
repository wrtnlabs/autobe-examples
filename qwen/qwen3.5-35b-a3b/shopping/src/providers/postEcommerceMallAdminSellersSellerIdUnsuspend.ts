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
import { EcommerceMallSellerAtSummaryTransformer } from "../transformers/EcommerceMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminSellersSellerIdUnsuspend(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSeller.ISummary> {
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
    where: {
      id: props.sellerId,
      deleted_at: null,
    },
  });
  if (seller === null) {
    throw new HttpException("Seller not found", 404);
  }
  if (!seller.is_suspended) {
    throw new HttpException("Seller is not suspended", 400);
  }
  const updatedAt = toISOStringSafe(new Date());
  await MyGlobal.prisma.ecommerce_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      is_suspended: false,
      updated_at: updatedAt,
    },
  });
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.ecommerce_mall_snapshot_audits.create({
    data: {
      id: v4(),
      record_type: "Seller" as const,
      record_id: props.sellerId,
      changes: "unsuspend" as const,
      old_values: JSON.stringify({ is_suspended: true }),
      new_values: JSON.stringify({ is_suspended: false }),
      changed_at: now,
      changed_by: props.admin.id,
      created_at: now,
      updated_at: now,
    },
  });
  const updatedSeller =
    await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow({
      where: { id: props.sellerId },
      ...EcommerceMallSellerAtSummaryTransformer.select(),
    });
  return await EcommerceMallSellerAtSummaryTransformer.transform(updatedSeller);
}
