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
import { ShoppingMallAdminRequestCollector } from "../collectors/ShoppingMallAdminRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallAdminRequestTransformer } from "../transformers/ShoppingMallAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerAdminRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallAdminRequest.ICreate;
}): Promise<IShoppingMallAdminRequest> {
  const existingPending =
    await MyGlobal.prisma.shopping_mall_admin_requests.findFirst({
      where: {
        shopping_mall_customer_id: props.customer.id,
        status: "PENDING",
        deleted_at: null,
      },
    });
  if (existingPending !== null) {
    throw new HttpException("Conflict", 409);
  }
  const created = await MyGlobal.prisma.shopping_mall_admin_requests.create({
    data: await ShoppingMallAdminRequestCollector.collect({
      body: props.body,
      shoppingMallCustomers: { id: props.customer.id },
    }),
    ...ShoppingMallAdminRequestTransformer.select(),
  });
  return await ShoppingMallAdminRequestTransformer.transform(created);
}
