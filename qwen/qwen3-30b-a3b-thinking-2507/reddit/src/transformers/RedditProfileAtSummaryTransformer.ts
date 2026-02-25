import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditMemberAtSummaryTransformer } from "./RedditMemberAtSummaryTransformer";

export namespace RedditProfileAtSummaryTransformer {
  export type Payload = Prisma.reddit_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        bio: true,
        avatar: true,
        karma: true,
        created_at: true,
        member: RedditMemberAtSummaryTransformer.select(),
        updated_at: true,
        deleted_at: true,
        snapshots: true,
        moderationLogs: true,
        bannedCommunities: true,
      },
    } satisfies Prisma.reddit_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditProfile.ISummary> {
    return {
      id: input.id,
      display_name: input.display_name,
      bio: input.bio ?? null,
      avatar: input.avatar ?? null,
      karma: input.karma,
      created_at: input.created_at.toISOString(),
      member: await RedditMemberAtSummaryTransformer.transform(input.member),
    };
  }
}
