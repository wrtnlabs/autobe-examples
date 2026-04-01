import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostSnapshot";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";
import { RedditCommunityPostAtSummaryTransformer } from "./RedditCommunityPostAtSummaryTransformer";

export namespace RedditCommunityPostSnapshotTransformer {
  export type Payload = Prisma.reddit_community_post_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        post_type: true,
        text_body: true,
        link_url: true,
        image_file_id: true,
        vote_score: true,
        comment_count: true,
        created_at: true,
        post: {
          select: RedditCommunityPostAtSummaryTransformer.select().select,
        },
        editedByMember: {
          select: RedditCommunityMemberAtSummaryTransformer.select().select,
        },
      },
    } satisfies Prisma.reddit_community_post_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityPostSnapshot> {
    return {
      id: input.id,
      redditCommunityPostId: input.post.id,
      editedByMember: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.editedByMember,
      ),
      title: input.title,
      postType: input.post_type,
      textBody: input.text_body ?? null,
      linkUrl: input.link_url ?? null,
      imageFileId: input.image_file_id ?? null,
      voteScore: input.vote_score,
      commentCount: input.comment_count,
      createdAt: toISOStringSafe(input.created_at),
      post: await RedditCommunityPostAtSummaryTransformer.transform(input.post),
    };
  }
}
