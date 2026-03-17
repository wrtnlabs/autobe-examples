import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneMemberAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        username: true,
        display_name: true,
        avatar: true,
        created_at: true,
        karmaScore: {
          select: {
            score: true,
          },
        },
      },
    } satisfies Prisma.reddit_clone_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneMember.ISummary> {
    return {
      id: input.id,
      username: input.username,
      display_name: input.display_name,
      avatar: input.avatar ?? undefined,
      karma_score: input.karmaScore?.score ?? 0,
      created_at: input.created_at.toISOString(),
    };
  }
}
