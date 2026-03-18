import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministratorRequestApplicantSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequestApplicantSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallAdministratorRequestApplicantSellerTransformer {
  export type Payload =
    Prisma.shopping_mall_administrator_request_applicant_sellersGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        shopping_mall_administrator_request_id: true,
        shopping_mall_seller_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_administrator_request_applicant_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdministratorRequestApplicantSeller> {
    return {
      id: input.id,
      shopping_mall_administrator_request_id:
        input.shopping_mall_administrator_request_id,
      shopping_mall_seller_id: input.shopping_mall_seller_id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
