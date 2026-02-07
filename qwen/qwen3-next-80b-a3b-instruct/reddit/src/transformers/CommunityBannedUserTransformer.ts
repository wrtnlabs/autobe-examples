import { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityBannedUserTransformer {
  export type Payload = Prisma.community_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        community: { select: { id: true } },
        bannedUser: { select: { id: true } },
        bannedBy: { select: { id: true } },
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityBannedUser> {
    return {
      id: input.id,
      community_id: input.community.id,
      banned_user_id: input.bannedUser.id,
      banned_by_id: input.bannedBy.id,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
