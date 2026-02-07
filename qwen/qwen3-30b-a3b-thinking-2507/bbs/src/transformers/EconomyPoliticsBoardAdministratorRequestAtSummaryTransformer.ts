import { IEconomyPoliticsBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdministratorRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomyPoliticsBoardAdministratorRequestAtSummaryTransformer {
  export type Payload =
    Prisma.economy_politics_board_administrator_requestsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        requestor: true,
      },
    } satisfies Prisma.economy_politics_board_administrator_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomyPoliticsBoardAdministratorRequest.ISummary> {
    return {
      id: input.id,
      status: typia.assert<"pending" | "approved" | "rejected">(input.status),
      reason: input.reason,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}
