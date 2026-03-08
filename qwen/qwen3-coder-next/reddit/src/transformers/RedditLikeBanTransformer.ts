import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeBan";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeBanTransformer {
  export type Payload = Prisma.reddit_like_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        bannedUser: true,
        bannedCommunity: true,
      },
    } satisfies Prisma.reddit_like_bansFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditLikeBan> {
    return {
      id: input.id,
      reddit_like_user_id: input.bannedUser.id,
      reddit_like_community_id: input.bannedCommunity.id,
      status: typia.assert<"active" | "inactive">(input.status),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
