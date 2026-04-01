import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentSnapshot";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityCommentAtSummaryTransformer } from "./RedditCommunityCommentAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";
import { RedditCommunityPostAtSummaryTransformer } from "./RedditCommunityPostAtSummaryTransformer";

export namespace RedditCommunityCommentSnapshotTransformer {
  export type Payload = Prisma.reddit_community_comment_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        version: true,
        created_at: true,
        comment: {
          select: { id: true },
        },
        author: RedditCommunityMemberAtSummaryTransformer.select(),
        post: RedditCommunityPostAtSummaryTransformer.select(),
        parentComment: RedditCommunityCommentAtSummaryTransformer.select(),
      },
    };
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityCommentSnapshot> {
    return {
      id: input.id,
      content: input.content,
      version: input.version,
      created_at: toISOStringSafe(input.created_at),
      comment_id: input.comment.id,
      author: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.author,
      ),
      post: await RedditCommunityPostAtSummaryTransformer.transform(input.post),
      parentComment: input.parentComment
        ? await RedditCommunityCommentAtSummaryTransformer.transform(
            input.parentComment,
          )
        : undefined,
    };
  }
}
