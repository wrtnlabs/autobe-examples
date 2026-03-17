import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformPostAtSummaryTransformer {
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        content_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: CommunityPlatformMemberAtSummaryTransformer.select(),
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        comments: {
          select: {
            id: true,
            deleted_at: true,
          },
        } satisfies Prisma.community_platform_commentsFindManyArgs,
        postVotes: {
          select: {
            id: true,
            type: true,
          },
        } satisfies Prisma.community_platform_post_votesFindManyArgs,
        linkContent: {
          select: {
            id: true,
            domain: true,
          },
        } satisfies Prisma.community_platform_post_linksFindManyArgs,
        textContent: {
          select: {
            id: true,
            content: true,
          },
        } satisfies Prisma.community_platform_post_textsFindManyArgs,
        attachments: {
          select: {
            id: true,
            position: true,
            mime_type: true,
            file: {
              select: {
                id: true,
                // thumbnail_url removed because it doesn't exist in Prisma schema
              },
            } satisfies Prisma.community_platform_filesFindManyArgs,
          },
          orderBy: { position: "asc" } as const,
        } satisfies Prisma.community_platform_post_attachmentsFindManyArgs,
        snapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_post_snapshotsFindManyArgs,
        viewStats: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_post_view_statsFindManyArgs,
        voteSnapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_post_vote_snapshotsFindManyArgs,
        reports: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_content_reportsFindManyArgs,
        postReports: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_user_report_of_postsFindManyArgs,
      },
    } satisfies Prisma.community_platform_postsFindManyArgs;
  }
  export type Payload = Prisma.community_platform_postsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPost.ISummary> {
    const voteScore = input.postVotes.reduce((sum, vote) => {
      if (vote.type === "up") return sum + 1;
      if (vote.type === "down") return sum - 1;
      return sum;
    }, 0);
    const commentCount = input.comments.filter(
      (comment) => comment.deleted_at === null,
    ).length;
    let contentPreview = "";
    if (input.content_type === "TEXT" && input.textContent) {
      contentPreview = input.textContent.content.substring(0, 200);
    } else if (input.content_type === "LINK" && input.linkContent) {
      contentPreview = input.linkContent.domain;
    } else if (
      input.content_type === "IMAGE" &&
      input.attachments.length > 0 &&
      input.attachments[0].file
    ) {
      // thumbnail_url is no longer selected, so it will be undefined
      const thumbnailUrl = undefined;
      contentPreview =
        thumbnailUrl ||
        `Image post with ${input.attachments.length} attachment(s)`;
    }
    return {
      id: input.id,
      title: input.title,
      author: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      vote_score: voteScore,
      comment_count: commentCount,
      created_at: toISOStringSafe(input.created_at),
      content_preview: contentPreview,
    };
  }
}
