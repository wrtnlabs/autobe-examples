import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSuperAdminTransformer {
  export type Payload = Prisma.discussion_board_super_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        is_super_admin: true,
        can_promote_super_admins: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        password_hash: true,
        promotedAdministrators: true,
        sessions: true,
        passwordResets: true,
        initiatedResets: true,
        emailVerifications: true,
      },
    } satisfies Prisma.discussion_board_super_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSuperAdmin> {
    return {
      id: input.id,
      email: input.email,
      isSuperAdmin: input.is_super_admin,
      canPromoteSuperAdmins: input.can_promote_super_admins,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
