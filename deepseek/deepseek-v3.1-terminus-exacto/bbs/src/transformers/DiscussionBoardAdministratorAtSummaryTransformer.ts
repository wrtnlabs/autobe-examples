import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardAdministratorAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_administratorsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        grade: true,
        promoted_at: true,
        grade_changed_at: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: DiscussionBoardUserAtSummaryTransformer.select(),
        admin: true,
        superAdmin: true,
      },
    } satisfies Prisma.discussion_board_administratorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministrator.ISummary> {
    return {
      id: input.id,
      grade: input.grade,
      promoted_at: toISOStringSafe(input.promoted_at),
      grade_changed_at: input.grade_changed_at
        ? toISOStringSafe(input.grade_changed_at)
        : null,
      is_active: input.is_active,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      user: await DiscussionBoardUserAtSummaryTransformer.transform(input.user),
    };
  }
}
