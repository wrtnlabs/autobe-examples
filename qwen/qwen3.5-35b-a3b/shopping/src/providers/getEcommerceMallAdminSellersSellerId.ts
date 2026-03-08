import { IEcommerceMallSellerDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerDetail";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerDetailTransformer } from "../transformers/EcommerceMallSellerDetailTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminSellersSellerId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSellerDetail> {
  if (props.admin.type !== "admin") {
    throw new HttpException("Forbidden", 403);
  }
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findUnique({
    where: { id: props.admin.id },
    select: { id: true, is_banned: true },
  });
  if (admin === null || admin.is_banned) {
    throw new HttpException("Forbidden", 403);
  }
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: props.sellerId },
      ...EcommerceMallSellerDetailTransformer.select(),
    },
  );
  return await EcommerceMallSellerDetailTransformer.transform(seller);
}
