import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityPostLinkContentTransformer {
  export type Payload = Prisma.reddit_community_post_linksGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        url: true,
        domain: true,
        created_at: true,
        updated_at: true,
        post: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_community_postsFindManyArgs,
      },
    } satisfies Prisma.reddit_community_post_linksFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityPostLinkContent> {
    return {
      url: input.url,
      domain: input.domain,
    } satisfies IRedditCommunityPostLinkContent;
  }
}
