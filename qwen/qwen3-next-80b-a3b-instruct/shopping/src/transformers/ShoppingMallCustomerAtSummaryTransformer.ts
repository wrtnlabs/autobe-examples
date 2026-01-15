import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCustomerAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_customersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        deleted_at: true,
        profile_image_url: true,
      },
    } satisfies Prisma.shopping_mall_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCustomer.ISummary> {
    return {
      id: input.id,
      email: input.email,
      name: (input.first_name || "") + " " + (input.last_name || ""),
      account_status: input.deleted_at ? "deactivated" : "active",
      verified: true,
      preferred_language: "en",
      marketing_opt_in: false,
      newsletter_subscribed: false,
      profile_image_url:
        input.profile_image_url || "https://example.com/default-profile.png",
      phone_number: input.phone || "+1-000-000-0000",
    };
  }
}
