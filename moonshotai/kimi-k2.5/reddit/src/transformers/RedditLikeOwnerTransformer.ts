import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeOwnerTransformer {
  export type Payload = Prisma.reddit_like_ownersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        // password_hash intentionally excluded for security
        // sessions, passwordResets, auditLogs not needed for this DTO
      },
    } satisfies Prisma.reddit_like_ownersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditLikeOwner> {
    return {
      id: input.id,
      email: input.email,
      username: input.username,
      display_name: input.display_name,
      is_active: input.is_active,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
