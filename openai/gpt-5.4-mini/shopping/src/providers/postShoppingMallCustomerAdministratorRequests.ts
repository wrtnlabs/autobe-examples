import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallAdministratorRequestCollector } from "../collectors/ShoppingMallAdministratorRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallAdministratorRequestTransformer } from "../transformers/ShoppingMallAdministratorRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerAdministratorRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallAdministratorRequest.ICreate;
}): Promise<IShoppingMallAdministratorRequest> {
  const reason = props.body.reason;
  if (reason.length === 0) throw new HttpException("Reason is required", 400);
  await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
    where: { id: props.customer.id },
    select: { id: true },
  });
  const duplicate =
    await MyGlobal.prisma.shopping_mall_administrator_requests.findFirst({
      where: {
        status: "pending",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (duplicate !== null)
    throw new HttpException("Duplicate pending request", 409);
  const created =
    await MyGlobal.prisma.shopping_mall_administrator_requests.create({
      data: await ShoppingMallAdministratorRequestCollector.collect({
        body: props.body,
      }),
      ...ShoppingMallAdministratorRequestTransformer.select(),
    });
  return await ShoppingMallAdministratorRequestTransformer.transform(created);
}
