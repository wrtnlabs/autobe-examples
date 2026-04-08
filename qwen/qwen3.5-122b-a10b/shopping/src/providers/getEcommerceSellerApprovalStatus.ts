import { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceSellerApprovalTransformer } from "../transformers/EcommerceSellerApprovalTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSellerApprovalStatus(props: {
  seller: SellerPayload;
}): Promise<IEcommerceSellerApproval> {
  const record =
    await MyGlobal.prisma.ecommerce_seller_approvals.findFirstOrThrow({
      where: {
        seller_id: props.seller.id,
        deleted_at: null,
      },
      ...EcommerceSellerApprovalTransformer.select(),
    });
  return await EcommerceSellerApprovalTransformer.transform(record);
}
