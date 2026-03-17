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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallAdminRequestTransformer } from "../transformers/ShoppingMallAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSuperAdminAdminRequestsRequestIdReject(props: {
  superAdmin: SuperadminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IShoppingMallAdminRequest.IReject;
}): Promise<IShoppingMallAdminRequest> {
  const request =
    await MyGlobal.prisma.shopping_mall_admin_requests.findUniqueOrThrow({
      where: { id: props.requestId },
    });
  if (request.status !== "PENDING") {
    throw new HttpException("Request has already been processed", 409);
  }
  await MyGlobal.prisma.shopping_mall_admin_requests.update({
    where: { id: props.requestId },
    data: {
      status: "REJECTED",
      responded_by_super_admin_id: props.superAdmin.id,
      responded_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_admin_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      ...ShoppingMallAdminRequestTransformer.select(),
    });
  return await ShoppingMallAdminRequestTransformer.transform(updated);
}
