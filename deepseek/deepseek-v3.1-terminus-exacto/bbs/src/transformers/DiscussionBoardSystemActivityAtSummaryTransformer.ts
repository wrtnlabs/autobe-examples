import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardSuperAdminTransformer } from "./DiscussionBoardSuperAdminTransformer";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardSystemActivityAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_system_activitiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        activity_type: true,
        target_entity_type: true,
        target_entity_id: true,
        success_status: true,
        created_at: true,
        user: DiscussionBoardUserAtSummaryTransformer.select(),
        admin: DiscussionBoardAdminAtSummaryTransformer.select(),
        superAdmin: DiscussionBoardSuperAdminTransformer.select(),
      },
    } satisfies Prisma.discussion_board_system_activitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSystemActivity.ISummary> {
    return {
      id: input.id,
      activity_type: input.activity_type,
      target_entity_type: input.target_entity_type ?? null,
      target_entity_id: input.target_entity_id ?? null,
      success_status: input.success_status,
      created_at: toISOStringSafe(input.created_at),
      user: input.user
        ? await DiscussionBoardUserAtSummaryTransformer.transform(input.user)
        : null,
      admin: input.admin
        ? await DiscussionBoardAdminAtSummaryTransformer.transform(input.admin)
        : null,
      superAdmin: input.superAdmin
        ? await DiscussionBoardSuperAdminTransformer.transform(input.superAdmin)
        : null,
    };
  }
}
