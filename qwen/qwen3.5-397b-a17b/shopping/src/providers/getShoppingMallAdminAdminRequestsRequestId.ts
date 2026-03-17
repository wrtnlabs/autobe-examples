import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdminRequestTransformer } from "../transformers/ShoppingMallAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminAdminRequestsRequestId(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminRequest> {
  const request =
    await MyGlobal.prisma.shopping_mall_admin_requests.findUniqueOrThrow({
      where: {
        id: props.requestId,
        deleted_at: null,
      },
      ...ShoppingMallAdminRequestTransformer.select(),
    });
  const superAdmin = await MyGlobal.prisma.shopping_mall_super_admins.findFirst(
    {
      where: {
        id: props.admin.id,
        deleted_at: null,
      },
    },
  );
  if (superAdmin === null) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallAdminRequestTransformer.transform(request);
}
