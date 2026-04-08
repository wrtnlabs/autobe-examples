import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditClonePostAtSummaryTransformer } from "./RedditClonePostAtSummaryTransformer";

export namespace RedditClonePostSnapshotTransformer {
  export type Payload = Prisma.reddit_clone_post_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        post_type: true,
        text_content: true,
        link_url: true,
        image_url: true,
        snapshot_created_at: true,
        post: RedditClonePostAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_post_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditClonePostSnapshot> {
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type,
      text_content: input.text_content,
      link_url: input.link_url,
      image_url: input.image_url,
      snapshot_created_at: input.snapshot_created_at.toISOString(),
      post: await RedditClonePostAtSummaryTransformer.transform(input.post),
    };
  }
}
