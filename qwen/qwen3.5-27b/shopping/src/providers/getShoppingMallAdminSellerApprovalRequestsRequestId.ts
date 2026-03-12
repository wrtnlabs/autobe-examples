import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSellerApprovalRequestTransformer } from "../transformers/ShoppingMallSellerApprovalRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminSellerApprovalRequestsRequestId(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerApprovalRequest> {
  const request =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.findUniqueOrThrow(
      {
        where: {
          id: props.requestId,
          deleted_at: null,
        },
        ...ShoppingMallSellerApprovalRequestTransformer.select(),
      },
    );
  return await ShoppingMallSellerApprovalRequestTransformer.transform(request);
}
