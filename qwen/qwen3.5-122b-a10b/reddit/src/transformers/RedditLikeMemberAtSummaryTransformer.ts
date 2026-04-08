import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeMemberAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        username: true,
        created_at: true,
        userProfile: {
          select: {
            display_name: true,
            bio: true,
            avatar: true,
            karma_score: true,
          },
        } satisfies Prisma.reddit_like_user_profilesFindFirstArgs,
      },
    } satisfies Prisma.reddit_like_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeMember.ISummary> {
    return {
      id: input.id,
      username: input.username,
      display_name: input.userProfile?.display_name ?? "",
      bio: input.userProfile?.bio ?? null,
      avatar: input.userProfile?.avatar ?? null,
      karma_score: (input.userProfile?.karma_score ??
        0) satisfies number as number,
      created_at: toISOStringSafe(input.created_at),
    } satisfies IRedditLikeMember.ISummary;
  }
}
