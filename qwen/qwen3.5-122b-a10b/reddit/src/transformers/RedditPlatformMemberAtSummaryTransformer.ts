import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformMemberAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        username: true,
        display_name: true,
        avatarFile: {
          select: {
            id: true,
          },
        },
        karma_score: true,
        created_at: true,
      },
    } satisfies Prisma.reddit_platform_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformMember.ISummary> {
    return {
      id: input.id,
      username: input.username,
      display_name: input.display_name ?? undefined,
      avatar_file_id: input.avatarFile?.id ?? undefined,
      karma_score: input.karma_score,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
