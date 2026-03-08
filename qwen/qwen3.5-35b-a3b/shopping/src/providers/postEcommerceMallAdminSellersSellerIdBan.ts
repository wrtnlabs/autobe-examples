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

export async function postEcommerceMallAdminSellersSellerIdBan(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IEcommerceMallSeller.IBanRequest;
}): Promise<IEcommerceMallSeller.ISummary> {
  // Validate seller exists
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findFirstOrThrow({
    where: { id: props.sellerId },
  });
  // Prevent re-banning an already banned seller
  if (seller.is_banned === true) {
    throw new HttpException("The seller account is already banned", 409);
  }
  // Update seller ban status and record ban reason
  await MyGlobal.prisma.ecommerce_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      is_banned: true,
      updated_at: new Date(),
    },
  });
  // Query updated seller with transform configuration
  const updatedSeller =
    await MyGlobal.prisma.ecommerce_mall_sellers.findFirstOrThrow({
      where: { id: props.sellerId },
      ...EcommerceMallSellerAtSummaryTransformer.select(),
    });
  return await EcommerceMallSellerAtSummaryTransformer.transform(updatedSeller);
}
