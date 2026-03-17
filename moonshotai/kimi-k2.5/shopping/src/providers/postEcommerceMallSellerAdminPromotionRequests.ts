import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallAdminPromotionRequestCollector } from "../collectors/EcommerceMallAdminPromotionRequestCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallAdminPromotionRequestTransformer } from "../transformers/EcommerceMallAdminPromotionRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerAdminPromotionRequests(props: {
  seller: SellerPayload;
  body: IEcommerceMallAdminPromotionRequest.ICreate;
}): Promise<IEcommerceMallAdminPromotionRequest> {
  // Check if seller already has a pending promotion request
  const existingRequest =
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
  if (existingRequest !== null) {
    throw new HttpException("Pending promotion request already exists", 400);
  }
  // Collect data using the collector
  const requestData = await EcommerceMallAdminPromotionRequestCollector.collect(
    {
      body: props.body,
    },
  );
  // Create the promotion request with Prisma transaction to ensure atomicity
  const requestId = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create main promotion request record
    const promotionRequest =
      await tx.ecommerce_mall_admin_promotion_requests.create({
        data: requestData,
        select: {
          id: true,
        },
      });
    // Create polymorphic subtype linking to seller
    await tx.ecommerce_mall_admin_promotion_request_sellers.create({
      data: {
        id: v4(),
        admin_promotion_request_id: promotionRequest.id,
        seller_id: props.seller.id satisfies string as string,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
      select: {
        id: true,
      },
    });
    return promotionRequest.id;
  });
  // Retrieve the complete entity with all relations for transformation
  const result =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: {
          id: requestId,
        },
        ...EcommerceMallAdminPromotionRequestTransformer.select(),
      },
    );
  // Transform and return the result
  return await EcommerceMallAdminPromotionRequestTransformer.transform(result);
}
