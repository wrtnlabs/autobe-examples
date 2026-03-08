import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallAdminRequestRequestCollector } from "../collectors/EcommerceMallAdminRequestRequestCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallAdminRequestRequestTransformer } from "../transformers/EcommerceMallAdminRequestRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerAdminRequests(props: {
  seller: SellerPayload;
  body: IEcommerceMallAdminRequestRequest.ICreate;
}): Promise<IEcommerceMallAdminRequestRequest> {
  const { seller, body } = props;
  // Validate reason field contains non-whitespace
  const trimmedReason = body.reason.trim();
  if (trimmedReason.length === 0) {
    throw new HttpException(
      "Reason must contain at least one non-whitespace character",
      400,
    );
  }
  // Verify seller is not banned
  const sellerRecord = await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
    where: { id: seller.id },
    select: { id: true, is_banned: true },
  });
  if (sellerRecord === null) {
    throw new HttpException("Seller not found", 400);
  }
  if (sellerRecord.is_banned === true) {
    throw new HttpException("Seller account is banned", 400);
  }
  // Check for existing pending admin request
  const existingRequest =
    await MyGlobal.prisma.ecommerce_mall_admin_request_requests.findFirst({
      where: {
        ecommerce_mall_admin_id: seller.id,
        request_status: "pending",
        deleted_at: null,
      },
    });
  if (existingRequest !== null) {
    throw new HttpException(
      "A pending admin request already exists for this seller",
      409,
    );
  }
  // Create the admin request
  const created =
    await MyGlobal.prisma.ecommerce_mall_admin_request_requests.create({
      data: await EcommerceMallAdminRequestRequestCollector.collect({
        body: { reason: trimmedReason },
        ecommerceMallAdmins: { id: seller.id },
      }),
      ...EcommerceMallAdminRequestRequestTransformer.select(),
    });
  return await EcommerceMallAdminRequestRequestTransformer.transform(created);
}
