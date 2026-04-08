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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceSellerApprovalTransformer } from "../transformers/EcommerceSellerApprovalTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdminApprovalsApprovalId(props: {
  admin: AdminPayload;
  approvalId: string & tags.Format<"uuid">;
}): Promise<IEcommerceSellerApproval> {
  const record =
    await MyGlobal.prisma.ecommerce_seller_approvals.findFirstOrThrow({
      where: {
        id: props.approvalId,
        deleted_at: null,
      },
      ...EcommerceSellerApprovalTransformer.select(),
    });
  return await EcommerceSellerApprovalTransformer.transform(record);
}
