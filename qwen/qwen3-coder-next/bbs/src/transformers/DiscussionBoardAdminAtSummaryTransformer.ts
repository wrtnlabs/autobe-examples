import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAdminAtSummaryTransformer {
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
        promotedBy: {
          select: {
            id: true,
          },
        },
        sessions: {
          select: {
            id: true,
          },
        },
        passwordResets: {
          select: {
            id: true,
          },
        },
        emailVerification: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdmin.ISummary> {
    return {
      id: input.id,
      display_name: input.display_name,
      email: input.email,
      is_super_admin: input.is_super_admin,
      is_active: input.is_active,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
