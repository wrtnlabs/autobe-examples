import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";
import { CommunityPlatformPostAttachmentTransformer } from "./CommunityPlatformPostAttachmentTransformer";
import { CommunityPlatformPostLinkTransformer } from "./CommunityPlatformPostLinkTransformer";
import { CommunityPlatformPostTextTransformer } from "./CommunityPlatformPostTextTransformer";

export namespace CommunityPlatformPostTransformer {
  export type Payload = Prisma.community_platform_postsGetPayload<
    ReturnType<typeof select>
  >;
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
        _count: {
          select: {
            comments: true,
          },
        },
        postVotes: {
          select: {
            type: true,
          },
        } satisfies Prisma.community_platform_post_votesFindManyArgs,
        textContent: CommunityPlatformPostTextTransformer.select(),
        linkContent: CommunityPlatformPostLinkTransformer.select(),
        attachments: CommunityPlatformPostAttachmentTransformer.select(),
      },
    } satisfies Prisma.community_platform_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPost> {
    // Compute vote score from postVotes
    const voteScore = input.postVotes.reduce((score, vote) => {
      if (vote.type === "up") return score + 1;
      if (vote.type === "down") return score - 1;
      return score;
    }, 0);
    // Handle polymorphic content
    let content:
      | ICommunityPlatformPostText
      | ICommunityPlatformPostLink
      | ICommunityPlatformPostAttachment;
    if (input.content_type === "TEXT") {
      if (!input.textContent) {
        throw new Error("TEXT post missing textContent");
      }
      content = await CommunityPlatformPostTextTransformer.transform(
        input.textContent,
      );
    } else if (input.content_type === "LINK") {
      if (!input.linkContent) {
        throw new Error("LINK post missing linkContent");
      }
      content = await CommunityPlatformPostLinkTransformer.transform(
        input.linkContent,
      );
    } else if (input.content_type === "IMAGE") {
      if (!input.attachments || input.attachments.length === 0) {
        throw new Error("IMAGE post missing attachments");
      }
      // For IMAGE posts, use the first attachment
      content = await CommunityPlatformPostAttachmentTransformer.transform(
        input.attachments[0],
      );
    } else {
      throw new Error(`Unsupported content_type: ${input.content_type}`);
    }
    return {
      id: input.id,
      title: input.title,
      content_type: input.content_type,
      author: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      vote_score: voteScore,
      comment_count: input._count.comments,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      content,
    };
  }
}
