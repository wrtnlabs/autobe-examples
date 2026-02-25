import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneContentPostAtCommunityPostCountTransformer {
  export type Payload = Prisma.reddit_clone_content_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        community_id: true,
        community: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: true,
      },
    } satisfies Prisma.reddit_clone_content_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneContentPost.ICommunityPostCount> {
    return {
      communityId: input.community_id,
      communityName: input.community.name,
      postCount: input._count.community,
    };
  }
}
