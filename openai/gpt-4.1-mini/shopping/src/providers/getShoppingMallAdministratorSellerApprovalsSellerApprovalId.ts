import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallSellerApprovalTransformer } from "../transformers/ShoppingMallSellerApprovalTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorSellerApprovalsSellerApprovalId(props: {
  administrator: AdministratorPayload;
  sellerApprovalId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerApproval> {
  const approval =
    await MyGlobal.prisma.shopping_mall_seller_approvals.findUniqueOrThrow({
      where: { id: props.sellerApprovalId },
      ...ShoppingMallSellerApprovalTransformer.select(),
    });
  return await ShoppingMallSellerApprovalTransformer.transform(approval);
}
