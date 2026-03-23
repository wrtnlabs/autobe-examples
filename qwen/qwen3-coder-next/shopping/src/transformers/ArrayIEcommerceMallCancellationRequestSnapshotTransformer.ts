import { IArrayIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IArrayIEcommerceMallCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ArrayIEcommerceMallCancellationRequestSnapshotTransformer {
  export type Payload =
    Prisma.ecommerce_mall_cancellation_request_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        responded_at: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        cancellationRequest: {
          select: { id: true, created_at: true },
        } satisfies Prisma.ecommerce_mall_cancellation_requestsFindManyArgs,
        resolvingSeller: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IArrayIEcommerceMallCancellationRequestSnapshot> {
    const snapshot = {
      id: input.id,
      reason: input.reason,
      status: input.status,
      respondedAt: input.responded_at
        ? toISOStringSafe(input.responded_at)
        : null,
      rejectionReason: input.rejection_reason ?? null,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      cancellationRequestId: input.cancellationRequest.id,
      resolvingSellerId: input.resolvingSeller?.id ?? null,
      resolvingSellerName: null,
    };
    return {
      value: JSON.stringify(snapshot),
    };
  }
}
