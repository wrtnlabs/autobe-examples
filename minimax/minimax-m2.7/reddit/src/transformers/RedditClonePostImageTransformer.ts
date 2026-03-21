import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneMemberSessionAtSummaryTransformer } from "./RedditCloneMemberSessionAtSummaryTransformer";

export namespace RedditClonePostImageTransformer {
  export type Payload = Prisma.reddit_clone_post_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        direction: true,
        created_at: true,
        updated_at: true,
        member: RedditCloneMemberSessionAtSummaryTransformer.select(),
        post: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_clone_postsFindManyArgs,
      },
    } satisfies Prisma.reddit_clone_post_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditClonePostImage> {
    return {
      id: input.id,
      direction: input.direction,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      member: await RedditCloneMemberSessionAtSummaryTransformer.transform(
        input.member,
      ),
    };
  }
}
