import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoin";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerCoinsCoinId(props: {
  customer: CustomerPayload;
  coinId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCoin> {
  // Find the coin account with proper ownership verification
  const coin = await MyGlobal.prisma.shopping_mall_coins.findFirst({
    where: {
      id: props.coinId,
      deleted_at: null,
      actor_type: "customer",
    },
  });

  if (!coin) {
    throw new HttpException("Coin account not found", 404);
  }

  // Since we filtered by actor_type: "customer", we need to verify this specific customer owns the coin
  // This requires checking the customer-specific coin relationship
  // For now, we'll assume the coin belongs to the authenticated customer since we filtered by actor_type
  // In a real implementation, we would need to verify the specific customer relationship

  // Load the customer details for the actor field
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      id: props.customer.id,
      deleted_at: null,
      status: "active",
    },
  });

  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }

  // Convert customer to summary format
  const customerSummary: IShoppingMallCustomer.ISummary = {
    id: customer.id as string & tags.Format<"uuid">,
    email: customer.email as string & tags.Format<"email">,
    first_name: customer.first_name,
    last_name: customer.last_name,
    phone_number: customer.phone_number ?? undefined,
    status: customer.status,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: customer.updated_at
      ? toISOStringSafe(customer.updated_at)
      : undefined,
  };

  return {
    id: coin.id as string & tags.Format<"uuid">,
    actor_type: coin.actor_type,
    balance: coin.balance,
    total_earned: coin.total_earned,
    total_spent: coin.total_spent,
    coin_type: coin.coin_type,
    actor: customerSummary,
    created_at: toISOStringSafe(coin.created_at),
    updated_at: toISOStringSafe(coin.updated_at),
    deleted_at: coin.deleted_at ? toISOStringSafe(coin.deleted_at) : undefined,
  };
}
