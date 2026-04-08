import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceSellerProfileTransformer } from "./EcommerceSellerProfileTransformer";

export namespace EcommerceSellerTransformer {
  export type Payload = Prisma.ecommerce_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        approval_status: true,
        rejection_reason: true,
        is_suspended: true,
        is_banned: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        profile: EcommerceSellerProfileTransformer.select(),
      },
    } satisfies Prisma.ecommerce_sellersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IEcommerceSeller> {
    return {
      id: input.id,
      approval_status: input.approval_status,
      rejection_reason: input.rejection_reason,
      is_suspended: input.is_suspended,
      is_banned: input.is_banned,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      profile: input.profile
        ? await EcommerceSellerProfileTransformer.transform(input.profile)
        : null,
    } satisfies IEcommerceSeller;
  }
}
