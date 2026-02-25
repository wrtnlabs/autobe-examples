import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardSuperAdminAtSummaryTransformer } from "./DiscussionBoardSuperAdminAtSummaryTransformer";

export namespace DiscussionBoardAdminTransformer {
  export type Payload = Prisma.discussion_board_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        email: true,
        password_hash: true,
        is_super_admin: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        promotedBy: DiscussionBoardSuperAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdmin> {
    return {
      id: input.id,
      display_name: input.display_name,
      email: input.email,
      is_super_admin: input.is_super_admin,
      is_active: input.is_active,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      promoted_by_id: input.promotedBy?.id ?? null,
      promotedBy: input.promotedBy
        ? await DiscussionBoardSuperAdminAtSummaryTransformer.transform(
            input.promotedBy,
          )
        : undefined,
    };
  }
}
