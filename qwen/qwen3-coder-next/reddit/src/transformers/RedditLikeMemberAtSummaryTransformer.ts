import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeMemberAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
      },
    } satisfies Prisma.reddit_like_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeMember.ISummary> {
    return {
      id: input.id,
      entity_type: typia.assert<"post" | "comment" | "community">(""),
      title: "",
      content: "",
      score: 0,
      hit_count: 0,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
