import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommentAtSummaryTransformer } from "./RedditCloneCommentAtSummaryTransformer";
import { RedditCloneMemberSessionAtSummaryTransformer } from "./RedditCloneMemberSessionAtSummaryTransformer";
import { RedditClonePostLinkAtSummaryTransformer } from "./RedditClonePostLinkAtSummaryTransformer";

export namespace RedditCloneCommentTransformer {
  export type Payload = Prisma.reddit_clone_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        vote_score: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post: RedditClonePostLinkAtSummaryTransformer.select(),
        member: RedditCloneMemberSessionAtSummaryTransformer.select(),
        parent: RedditCloneCommentAtSummaryTransformer.select(),
        replies: RedditCloneCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneComment> {
    return {
      id: input.id,
      content: input.deleted_at ? null : input.content,
      vote_score: input.vote_score,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      post: await RedditClonePostLinkAtSummaryTransformer.transform(input.post),
      author: await RedditCloneMemberSessionAtSummaryTransformer.transform(
        input.member,
      ),
      parent: input.parent
        ? await RedditCloneCommentAtSummaryTransformer.transform(input.parent)
        : null,
      replies: await ArrayUtil.asyncMap(
        input.replies,
        RedditCloneCommentAtSummaryTransformer.transform,
      ),
    };
  }
}
