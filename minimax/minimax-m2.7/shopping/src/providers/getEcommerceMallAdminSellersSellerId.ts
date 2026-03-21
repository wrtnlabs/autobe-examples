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
import { EcommerceMallSellerAtInvertTransformer } from "../transformers/EcommerceMallSellerAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminSellersSellerId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSeller.IInvert> {
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: {
        id: props.sellerId,
        deleted_at: null,
      },
      include: {
        profile: true,
        productSnapshots: true,
        cancellationRequests: true,
        refundRequests: true,
        shipments: true,
        sellerSessions: true,
        passwordResets: true,
        emailVerifications: true,
        adminRequest: true,
        adminRequests: true,
        products: true,
        refundRequestSnapshots: true,
        sellerApprovals: true,
        sellerSuspensions: true,
      },
    },
  );
  if (seller.profile === null) {
    throw new HttpException("Seller profile not found", 404);
  }
  return EcommerceMallSellerAtInvertTransformer.transform(seller);
}
