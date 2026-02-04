import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallConfigurationCollector } from "../collectors/ShoppingMallConfigurationCollector";

export async function postShoppingMallAdminConfigurations(props: {
  admin: AdminPayload;
  body: IShoppingMallConfiguration.ICreate;
}): Promise<IShoppingMallConfiguration> {
  const key = Object.keys(props.body)[0];
  const value = props.body[key];
  const created = await MyGlobal.prisma.shopping_mall_configurations.create({
    data: await ShoppingMallConfigurationCollector.collect({
      body: props.body,
    }),
    select: {
      key: true,
      value: true,
      category: true,
      description: true,
      enabled: true,
      created_at: true,
      updated_at: true,
    },
  });
  return {
    currency: created.value as string & tags.Pattern<"^[A-Z]{3}$">,
    timezone: created.value as string & tags.Pattern<"^[A-Za-z]+/[A-Za-z_]+$">,
    locale: created.value as string & tags.Pattern<"^[a-z]{2}-[A-Z]{2}$">,
    payment_gateway: created.value as
      | "stripe"
      | "paypal"
      | "razorpay"
      | "square",
    tax_calculation: created.value as "standard" | "reverse" | "exempt",
    shipping_rate_strategy: created.value as
      | "flat"
      | "weight_based"
      | "free_threshold"
      | "tiered",
    feature_toggles: JSON.parse(created.value as string) as {
      allow_seller_registration: boolean;
      require_email_verification: boolean;
      enable_product_reviews: boolean;
      auto_approve_sellers: boolean;
      allow_guest_checkout: boolean;
      use_dynamic_pricing: boolean;
      enable_live_chat: boolean;
      allow_bulk_product_import: boolean;
    },
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
