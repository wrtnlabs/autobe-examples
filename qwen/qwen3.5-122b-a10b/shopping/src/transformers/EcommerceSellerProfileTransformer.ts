import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceSellerAtSummaryTransformer } from "./EcommerceSellerAtSummaryTransformer";

export namespace EcommerceSellerProfileTransformer {
  export type Payload = Prisma.ecommerce_seller_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shop_name: true,
        shop_description: true,
        logo_image_url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: EcommerceSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_seller_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceSellerProfile> {
    return {
      id: input.id,
      shop_name: input.shop_name,
      shop_description: input.shop_description,
      logo_image_url: input.logo_image_url,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      seller: await EcommerceSellerAtSummaryTransformer.transform(input.seller),
    } satisfies IEcommerceSellerProfile;
  }
}
