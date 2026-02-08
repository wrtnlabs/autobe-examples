import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { IShoppingMallSellerApprovalRejectRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRejectRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorSellerApprovalsApprovalIdReject(props: {
  administrator: AdministratorPayload;
  approvalId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerApprovalRejectRequest;
}): Promise<IShoppingMallSellerApproval> {
  // reject because 'reason' property does not exist on type IShoppingMallSellerApprovalRejectRequest
  throw new Error(
    "Property 'reason' does not exist on IShoppingMallSellerApprovalRejectRequest",
  );
}
