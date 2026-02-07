import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSystemSettingTransformer {
  export type Payload = Prisma.shopping_mall_system_settingsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        commission_rate: true,
        premium_subscription_fee: true,
        cancellation_auto_approve_hours: true,
        refund_auto_approve_hours: true,
        max_product_per_seller: true,
        max_image_per_product: true,
        min_review_length: true,
        max_review_length: true,
        min_cancellation_reason_length: true,
        max_cancellation_reason_length: true,
        min_refund_reason_length: true,
        max_refund_reason_length: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.shopping_mall_system_settingsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSystemSetting> {
    return {
      id: input.id,
      commission_rate: input.commission_rate,
      premium_subscription_fee: input.premium_subscription_fee,
      cancellation_auto_approve_hours: input.cancellation_auto_approve_hours,
      refund_auto_approve_hours: input.refund_auto_approve_hours,
      max_product_per_seller: input.max_product_per_seller,
      max_image_per_product: input.max_image_per_product,
      min_review_length: input.min_review_length,
      max_review_length: input.max_review_length,
      min_cancellation_reason_length: input.min_cancellation_reason_length,
      max_cancellation_reason_length: input.max_cancellation_reason_length,
      min_refund_reason_length: input.min_refund_reason_length,
      max_refund_reason_length: input.max_refund_reason_length,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
