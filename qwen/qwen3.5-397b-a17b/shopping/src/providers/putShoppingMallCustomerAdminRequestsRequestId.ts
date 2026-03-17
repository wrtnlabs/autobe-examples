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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallAdminRequestTransformer } from "../transformers/ShoppingMallAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerAdminRequestsRequestId(props: {
  customer: CustomerPayload;
  requestId: string & tags.Format<"uuid">;
  body: IShoppingMallAdminRequest.IUpdate;
}): Promise<IShoppingMallAdminRequest> {
  const adminRequest =
    await MyGlobal.prisma.shopping_mall_admin_requests.findUniqueOrThrow({
      where: {
        id: props.requestId,
        deleted_at: null,
      },
    });
  const superAdmin = await MyGlobal.prisma.shopping_mall_super_admins.findFirst(
    {
      where: {
        id: props.customer.id,
        deleted_at: null,
      },
    },
  );
  if (!superAdmin) {
    throw new HttpException("Forbidden", 403);
  }
  if (adminRequest.status !== "PENDING") {
    throw new HttpException("Cannot modify responded request", 400);
  }
  if (props.body.status !== undefined) {
    if (props.body.status !== "APPROVED" && props.body.status !== "REJECTED") {
      throw new HttpException("Invalid status value", 400);
    }
  }
  await MyGlobal.prisma.shopping_mall_admin_requests.update({
    where: { id: props.requestId },
    data: {
      ...(props.body.status !== undefined && { status: props.body.status }),
      responded_by_super_admin_id: props.customer.id,
      responded_at: new Date(),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_admin_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      ...ShoppingMallAdminRequestTransformer.select(),
    });
  return await ShoppingMallAdminRequestTransformer.transform(updated);
}
