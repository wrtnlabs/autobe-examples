import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSellerAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        approval_status: true,
        created_at: true,
        deleted_at: true,
        registrations: {
          select: {
            status: true,
            created_at: true,
          },
        } satisfies Prisma.ecommerce_mall_seller_registrationsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSeller.ISummary> {
    const latestRegistration = input.registrations.sort(
      (a, b) => b.created_at.getTime() - a.created_at.getTime(),
    )[0];
    return {
      id: input.id,
      email: input.email,
      approvalStatus:
        input.approval_status as IEcommerceMallSeller.ISummary["approvalStatus"],
      createdAt: input.created_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      registrationCount: input.registrations.length,
      latestRegistrationStatus: latestRegistration?.status ?? null,
    };
  }
}
