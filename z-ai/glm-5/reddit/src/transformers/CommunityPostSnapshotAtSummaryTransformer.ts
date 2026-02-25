import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityCommunityAtSummaryTransformer } from "./CommunityCommunityAtSummaryTransformer";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";

export namespace CommunityPostSnapshotAtSummaryTransformer {
  export type Payload = Prisma.community_post_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        community_post_id: true,
        title: true,
        post_type: true,
        link_url: true,
        image_thumbnail_url: true,
        vote_score: true,
        upvote_count: true,
        downvote_count: true,
        comment_count: true,
        hot_score: true,
        controversy_score: true,
        created_at: true,
        original_created_at: true,
        snapshot_reason: true,
        member: CommunityMemberAtSummaryTransformer.select(),
        community: CommunityCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_post_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPostSnapshot.ISummary> {
    return {
      id: input.id,
      community_post_id: input.community_post_id,
      title: input.title,
      post_type: input.post_type,
      author: await CommunityMemberAtSummaryTransformer.transform(input.member),
      community: await CommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      vote_score: input.vote_score,
      upvote_count: input.upvote_count,
      downvote_count: input.downvote_count,
      comment_count: input.comment_count,
      hot_score: input.hot_score,
      controversy_score: input.controversy_score,
      snapshot_reason: input.snapshot_reason,
      created_at: input.created_at.toISOString(),
      original_created_at: input.original_created_at.toISOString(),
      link_url: input.link_url,
      image_thumbnail_url: input.image_thumbnail_url,
    };
  }
}
