import { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardStatusTypeAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_status_typesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        category: true,
        code: true,
        display_name: true,
        display_order: true,
        is_active: true,
      },
    } satisfies Prisma.discussion_board_status_typesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardStatusType.ISummary> {
    return {
      id: input.id,
      category: input.category,
      code: input.code,
      display_name: input.display_name,
      display_order: input.display_order,
      is_active: input.is_active,
    };
  }
}
