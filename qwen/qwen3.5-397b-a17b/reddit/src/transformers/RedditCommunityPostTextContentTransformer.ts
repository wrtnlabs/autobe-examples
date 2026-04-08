import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityPostTextContentTransformer {
  export type Payload = Prisma.reddit_community_post_textsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        body: true,
        created_at: true,
        updated_at: true,
        post: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_community_postsFindManyArgs,
      },
    } satisfies Prisma.reddit_community_post_textsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityPostTextContent> {
    return {
      body: input.body,
    } satisfies IRedditCommunityPostTextContent;
  }
}
