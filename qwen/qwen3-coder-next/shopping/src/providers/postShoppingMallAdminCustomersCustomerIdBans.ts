import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCustomerTransformer } from "../transformers/ShoppingMallCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminCustomersCustomerIdBans(props: {
  admin: AdminPayload;
  customerId: string;
  body: IShoppingMallCustomer.IBan;
}): Promise<IShoppingMallCustomer> {
  // Check customer exists and is not already banned
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findFirstOrThrow({
      where: {
        id: props.customerId,
        deleted_at: null,
      },
    });
  // Calculate ban expiration if duration is provided
  const banned_until =
    props.body.duration !== null
      ? toISOStringSafe(
          new Date(Date.now() + props.body.duration * 24 * 60 * 60 * 1000),
        )
      : null;
  // Update customer to mark as banned
  const bannedCustomer = await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: props.customerId },
    data: {
      deleted_at: toISOStringSafe(new Date()), // soft delete with current timestamp
      ...(banned_until !== null && { banned_until }),
    },
  });
  // Invalidate all active customer sessions
  await MyGlobal.prisma.shopping_mall_customer_sessions.deleteMany({
    where: { shopping_mall_customer_id: props.customerId },
  });
  // Clear customer's shopping cart
  await MyGlobal.prisma.shopping_mall_shopping_carts.deleteMany({
    where: { shopping_mall_customer_id: props.customerId },
  });
  // Log the ban action
  await MyGlobal.prisma.shopping_mall_system_audit_logs.create({
    data: {
      id: v4(),
      actor_type: "admin",
      actor_id: props.admin.id,
      operation_type: "ban",
      entity_type: "customer",
      entity_id: props.customerId,
      ip_address: "0.0.0.0",
      user_agent: "system",
      old_values: JSON.stringify({}),
      new_values: JSON.stringify({
        deleted_at: toISOStringSafe(new Date()),
        reason: props.body.reason,
        duration: props.body.duration,
      }),
      description: `Customer banned by admin: ${props.body.reason}`,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });
  return ShoppingMallCustomerTransformer.transform(bannedCustomer);
}
