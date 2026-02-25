import { IDiscussionBoardAdministratorCapability } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorCapability";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAdministratorCapabilityAtSummaryTransformer {
  export type Payload =
    Prisma.discussion_board_administrator_capabilitiesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        capability_type: true,
        permission_level: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.discussion_board_administrator_capabilitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministratorCapability.ISummary> {
    return {
      id: input.id,
      capability_type: input.capability_type,
      permission_level: input.permission_level,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
