import { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSuperAdminAtSummaryTransformer } from "./EcommerceMallSuperAdminAtSummaryTransformer";

export namespace EcommerceMallAdminRequestAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_admin_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        requested_grade: true,
        status: true,
        created_at: true,
        reviewer: EcommerceMallSuperAdminAtSummaryTransformer.select(),
        reason: true,
        reviewed_reason: true,
        updated_at: true,
        deleted_at: true,
        customer: true,
        adminRequestOfSeller: true,
      },
    } satisfies Prisma.ecommerce_mall_admin_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminRequest.ISummary> {
    return {
      id: input.id,
      actor_type: input.actor_type,
      requested_grade: input.requested_grade,
      status: input.status,
      created_at: input.created_at.toISOString(),
      reviewer: input.reviewer
        ? await EcommerceMallSuperAdminAtSummaryTransformer.transform(
            input.reviewer,
          )
        : undefined,
    };
  }
}
