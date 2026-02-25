import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformPostSnapshotAtSummaryTransformer {
  export type Payload = Prisma.community_platform_post_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        community_platform_post_id: true,
        title: true,
        content_text: true,
        content_url: true,
        content_image_url: true,
        post_type: true,
        author_user_id: true,
        community_id: true,
        vote_score: true,
        comment_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post: true,
      },
    } satisfies Prisma.community_platform_post_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPostSnapshot.ISummary> {
    return {
      id: input.id,
      communityPlatformPostId: input.community_platform_post_id,
      title: input.title,
      contentText: input.content_text,
      contentUrl: input.content_url,
      contentImageUrl: input.content_image_url,
      postType: input.post_type,
      authorUserId: input.author_user_id,
      communityId: input.community_id,
      voteScore: input.vote_score,
      commentCount: input.comment_count,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
