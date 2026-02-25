import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { ICommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityCommunityAtSummaryTransformer } from "./CommunityCommunityAtSummaryTransformer";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";
import { CommunityPostAtSummaryTransformer } from "./CommunityPostAtSummaryTransformer";

export namespace CommunityPostSnapshotTransformer {
  export type Payload = Prisma.community_post_snapshotsGetPayload<
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
        image_thumbnail_url: true,
        vote_score: true,
        upvote_count: true,
        downvote_count: true,
        comment_count: true,
        hot_score: true,
        controversy_score: true,
        created_at: true,
        original_created_at: true,
        original_updated_at: true,
        original_edited_at: true,
        snapshot_reason: true,
        post: CommunityPostAtSummaryTransformer.select(),
        member: CommunityMemberAtSummaryTransformer.select(),
        community: CommunityCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_post_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPostSnapshot> {
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type,
      text_content: input.text_content,
      link_url: input.link_url,
      image_url: input.image_url,
      image_thumbnail_url: input.image_thumbnail_url,
      vote_score: input.vote_score,
      upvote_count: input.upvote_count,
      downvote_count: input.downvote_count,
      comment_count: input.comment_count,
      hot_score: input.hot_score,
      controversy_score: input.controversy_score,
      created_at: input.created_at.toISOString(),
      original_created_at: input.original_created_at.toISOString(),
      original_updated_at: input.original_updated_at.toISOString(),
      original_edited_at: input.original_edited_at?.toISOString() ?? null,
      snapshot_reason: input.snapshot_reason,
      post: await CommunityPostAtSummaryTransformer.transform(input.post),
      author: await CommunityMemberAtSummaryTransformer.transform(input.member),
      community: await CommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
    };
  }
}
