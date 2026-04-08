import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommentAtSummaryTransformer } from "./RedditCloneCommentAtSummaryTransformer";
import { RedditClonePostAtSummaryTransformer } from "./RedditClonePostAtSummaryTransformer";

export namespace RedditCloneUserProfileTransformer {
  export type Payload = Prisma.reddit_clone_user_profilesGetPayload<
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
        updated_at: true,
        deleted_at: true,
        posts: RedditClonePostAtSummaryTransformer.select(),
        comments: RedditCloneCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_user_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneUserProfile> {
    return {
      id: input.id,
      display_name: input.display_name,
      bio: input.bio,
      avatar: input.avatar,
      karma: input.karma,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      posts: await ArrayUtil.asyncMap(input.posts, async (post) =>
        RedditClonePostAtSummaryTransformer.transform(post),
      ),
      comments: await ArrayUtil.asyncMap(input.comments, async (comment) =>
        RedditCloneCommentAtSummaryTransformer.transform(comment),
      ),
    };
  }
}
