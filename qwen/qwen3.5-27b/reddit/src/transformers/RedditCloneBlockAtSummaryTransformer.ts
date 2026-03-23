import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneBlock } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBlock";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditCloneBlockAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_blocksGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        blockedUser: RedditCloneMemberAtSummaryTransformer.select(),
        blocker: RedditCloneMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_blocksFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneBlock.ISummary> {
    return {
      id: input.id,
      blockedUser: await RedditCloneMemberAtSummaryTransformer.transform(
        input.blockedUser,
      ),
      created_at: input.created_at.toISOString(),
    };
  }
}
