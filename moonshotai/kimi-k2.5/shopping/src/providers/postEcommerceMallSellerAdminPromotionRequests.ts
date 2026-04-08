import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallAdminPromotionRequestTransformer } from "../transformers/EcommerceMallAdminPromotionRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerAdminPromotionRequests(props: {
  seller: SellerPayload;
  body: IEcommerceMallAdminPromotionRequest.ICreate;
}): Promise<IEcommerceMallAdminPromotionRequest> {
  // Check for existing pending promotion request
  const existingPending =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_request_sellers.findFirst(
      {
        where: {
          seller_id: props.seller.id,
          adminPromotionRequest: {
            status: "pending",
            deleted_at: null,
          },
        },
        select: {
          id: true,
        },
      },
    );
  if (existingPending !== null) {
    throw new HttpException(
      "You already have a pending promotion request",
      409,
    );
  }
  // Generate request ID and timestamps
  const requestId: string & tags.Format<"uuid"> = v4();
  const now = new Date();
  // Create both records in a single transaction
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.create({
      data: {
        id: requestId,
        status: "pending",
        reason: props.body.reason,
        rejection_reason: null,
        reviewer: undefined,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.ecommerce_mall_admin_promotion_request_sellers.create({
      data: {
        id: v4(),
        admin_promotion_request_id: requestId,
        seller_id: props.seller.id,
        created_at: now,
        updated_at: now,
      },
    }),
  ]);
  // Fetch complete record with relations for response
  const complete =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: { id: requestId },
        ...EcommerceMallAdminPromotionRequestTransformer.select(),
      },
    );
  return await EcommerceMallAdminPromotionRequestTransformer.transform(
    complete,
  );
}
