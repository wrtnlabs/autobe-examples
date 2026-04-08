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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallAdminPromotionRequestTransformer } from "../transformers/EcommerceMallAdminPromotionRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerAdminPromotionRequestsRequestId(props: {
  customer: CustomerPayload;
  requestId: string;
}): Promise<IEcommerceMallAdminPromotionRequest> {
  // Verify customer is a super admin by matching email
  const customerRecord =
    await MyGlobal.prisma.ecommerce_mall_customers.findUniqueOrThrow({
      where: { id: props.customer.id },
      select: { email: true },
    });
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: {
      email: customerRecord.email,
      grade: "super_admin",
      status: "active",
      deleted_at: null,
    },
  });
  if (!admin) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch promotion request with all relations
  const request =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findFirst({
      where: {
        id: props.requestId,
        deleted_at: null,
      },
      ...EcommerceMallAdminPromotionRequestTransformer.select(),
    });
  if (!request) {
    throw new HttpException("Not Found", 404);
  }
  return await EcommerceMallAdminPromotionRequestTransformer.transform(request);
}
