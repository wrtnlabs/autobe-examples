import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCancellationRequestStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequestStatus";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCancellationRequestAtSummaryTransformer } from "./EcommerceCancellationRequestAtSummaryTransformer";

export namespace EcommerceCancellationRequestStatusTransformer {
  export type Payload =
    Prisma.ecommerce_cancellation_request_statusesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        transition_notes: true,
        created_at: true,
        updated_at: true,
        cancellationRequest:
          EcommerceCancellationRequestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_cancellation_request_statusesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceCancellationRequestStatus> {
    return {
      id: input.id,
      status: input.status,
      transition_notes: input.transition_notes ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      cancellationRequest:
        await EcommerceCancellationRequestAtSummaryTransformer.transform(
          input.cancellationRequest,
        ),
    };
  }
}
