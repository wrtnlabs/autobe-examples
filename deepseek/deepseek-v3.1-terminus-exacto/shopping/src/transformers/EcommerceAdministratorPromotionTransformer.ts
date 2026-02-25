import { IEcommerceAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorPromotion";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCustomerAtSummaryTransformer } from "./EcommerceCustomerAtSummaryTransformer";
import { EcommerceSuperAdministratorAtSummaryTransformer } from "./EcommerceSuperAdministratorAtSummaryTransformer";

export namespace EcommerceAdministratorPromotionTransformer {
  export type Payload = Prisma.ecommerce_administrator_promotionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        request_reason: true,
        status: true,
        approval_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        approved_at: true,
        rejected_at: true,
        requestingUser: EcommerceCustomerAtSummaryTransformer.select(),
        approvingSuperAdministrator:
          EcommerceSuperAdministratorAtSummaryTransformer.select(),
        promotionRequest: true,
      },
    } satisfies Prisma.ecommerce_administrator_promotionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceAdministratorPromotion> {
    return {
      id: input.id,
      request_reason: input.request_reason,
      status: input.status,
      approval_reason: input.approval_reason ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      approved_at: input.approved_at?.toISOString() ?? null,
      rejected_at: input.rejected_at?.toISOString() ?? null,
      requestingUser: await EcommerceCustomerAtSummaryTransformer.transform(
        input.requestingUser,
      ),
      approvingSuperAdministrator: input.approvingSuperAdministrator
        ? await EcommerceSuperAdministratorAtSummaryTransformer.transform(
            input.approvingSuperAdministrator,
          )
        : null,
    };
  }
}
