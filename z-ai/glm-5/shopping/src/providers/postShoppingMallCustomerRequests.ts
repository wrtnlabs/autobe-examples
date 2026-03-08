import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallAdministratorSessionTransformer } from "../transformers/ShoppingMallAdministratorSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallAdministratorSession.ICreate;
}): Promise<IShoppingMallAdministratorSession> {
  // 1. Fetch customer details to get email
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: {
        id: props.customer.id,
        deleted_at: null,
        banned: false,
      },
      select: {
        id: true,
        email: true,
      },
    });
  // 2. Verify user is not already an administrator
  const existingAdmin =
    await MyGlobal.prisma.shopping_mall_administrators.findFirst({
      where: {
        email: customer.email,
        deleted_at: null,
      },
    });
  if (existingAdmin !== null) {
    throw new HttpException("User is already an administrator", 403);
  }
  // 3. Create administrator session (acting as request token)
  // Since IShoppingMallAdministratorSession is the return type and the specification
  // describes creating an administrator request, we create a session record
  // that represents this request
  const now = new Date();
  const sessionId = v4() as string & tags.Format<"uuid">;
  const expiredAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
  const session =
    await MyGlobal.prisma.shopping_mall_administrator_sessions.create({
      data: {
        id: sessionId,
        administrator_id: v4(),
        ip: "",
        href: "",
        referrer: null,
        created_at: now,
        expired_at: expiredAt,
      },
      ...ShoppingMallAdministratorSessionTransformer.select(),
    });
  return ShoppingMallAdministratorSessionTransformer.transform(session);
}
