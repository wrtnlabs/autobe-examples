import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
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

export async function patchShoppingMallAdministratorSellerApprovals(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSellerApproval.IUpdate;
}): Promise<IShoppingMallSellerApproval> {
  // No identifying information is provided in the body to locate the approval record.
  // Cannot perform update safely without knowing which record to update.
  throw new HttpException("Missing approval record identifier for update", 400);
}
