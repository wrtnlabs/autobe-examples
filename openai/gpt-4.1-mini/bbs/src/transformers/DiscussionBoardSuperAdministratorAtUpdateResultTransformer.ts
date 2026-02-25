import { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSuperAdministratorAtUpdateResultTransformer {
  export type Payload = Prisma.discussion_board_super_administratorsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        display_name: true,
        bio: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordReset: true,
      },
    } satisfies Prisma.discussion_board_super_administratorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSuperAdministrator.IUpdateResult> {
    return {
      success: true,
      updatedAdministrator: {
        id: input.id,
        email: input.email,
        displayName: input.display_name,
        bio: input.bio ?? null,
        createdAt: toISOStringSafe(input.created_at),
        updatedAt: toISOStringSafe(input.updated_at),
        deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      } as IDiscussionBoardSuperAdministrator.IUpdateResult["updatedAdministrator"],
    } as IDiscussionBoardSuperAdministrator.IUpdateResult;
  }
}
