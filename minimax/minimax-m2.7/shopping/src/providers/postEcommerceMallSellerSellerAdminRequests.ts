import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallSellerAdminRequestCollector } from "../collectors/EcommerceMallSellerAdminRequestCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerAdminRequestTransformer } from "../transformers/EcommerceMallSellerAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerSellerAdminRequests(props: {
  seller: SellerPayload;
  body: IEcommerceMallSellerAdminRequest.ICreate;
}): Promise<IEcommerceMallSellerAdminRequest> {
  // Check if seller already has a pending admin request (unique constraint)
  const existingRequest =
    await MyGlobal.prisma.ecommerce_mall_seller_admin_requests.findFirst({
      where: {
        ecommerce_mall_seller_id: props.seller.id,
        status: "pending",
        deleted_at: null,
      },
    });
  if (existingRequest) {
    throw new HttpException("Already have a pending admin request", 409);
  }
  // Fetch seller entity for collector (requires full IEntity)
  const sellerEntity =
    await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow({
      where: { id: props.seller.id },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
      },
    });
  // Fetch seller session entity for collector
  const sessionEntity =
    await MyGlobal.prisma.ecommerce_mall_seller_sessions.findUniqueOrThrow({
      where: { id: props.seller.session_id },
      select: {
        id: true,
        created_at: true,
      },
    });
  // Create the admin request using collector for data transformation
  const created =
    await MyGlobal.prisma.ecommerce_mall_seller_admin_requests.create({
      data: await EcommerceMallSellerAdminRequestCollector.collect({
        body: props.body,
        ecommerceMallSellers: sellerEntity,
        ecommerceMallSellerSessions: sessionEntity,
      }),
      ...EcommerceMallSellerAdminRequestTransformer.select(),
    });
  // Transform and return the response
  return EcommerceMallSellerAdminRequestTransformer.transform(created);
}
