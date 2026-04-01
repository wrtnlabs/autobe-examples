import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerApprovalRequestTransformer } from "../transformers/EcommerceMallSellerApprovalRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerApprovalRequestsApprovalRequestId(props: {
  seller: SellerPayload;
  approvalRequestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSellerApprovalRequest> {
  const approvalRequest =
    await MyGlobal.prisma.ecommerce_mall_seller_approval_requests.findUniqueOrThrow(
      {
        where: {
          id: props.approvalRequestId,
          deleted_at: null,
        },
        ...EcommerceMallSellerApprovalRequestTransformer.select(),
      },
    );
  const isOwner = approvalRequest.seller.id === props.seller.id;
  if (!isOwner) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallSellerApprovalRequestTransformer.transform(
    approvalRequest,
  );
}
