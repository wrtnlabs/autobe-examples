import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityFileAtSummaryTransformer } from "./RedditCommunityFileAtSummaryTransformer";

export namespace RedditCommunityCommunityIconTransformer {
  export type Payload = Prisma.reddit_community_community_iconsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        file: RedditCommunityFileAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_community_iconsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityCommunityIcon> {
    return {
      id: input.id,
      file: await RedditCommunityFileAtSummaryTransformer.transform(input.file),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
