import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";

export namespace RedditLikeCommunityBanAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_community_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community: { select: { id: true } },
        bannedMember: RedditLikeMemberAtSummaryTransformer.select(),
        bannedBy: RedditLikeMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_community_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeCommunityBan.ISummary> {
    return {
      id: input.id,
      bannedMember: await RedditLikeMemberAtSummaryTransformer.transform(
        input.bannedMember,
      ),
      bannedBy: await RedditLikeMemberAtSummaryTransformer.transform(
        input.bannedBy,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IRedditLikeCommunityBan.ISummary;
  }
}
