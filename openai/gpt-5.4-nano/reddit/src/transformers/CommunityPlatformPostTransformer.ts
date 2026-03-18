import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformPostTransformer {
  export type Payload = Prisma.community_platform_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        body: true,
        post_type: true,
        link_url: true,
        image_alt_text: true,
        image_cover_url: true,
        posted_at: true,
        edited_at: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_href: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            owner: {
              select: {
                id: true,
                userProfile: {
                  select: {
                    display_name: true,
                    bio: true,
                    avatar_uri: true,
                  },
                },
              },
            },
            communitySubscriptions: {
              select: {
                is_active: true,
                deleted_at: true,
              },
            },
          },
        },
        author: {
          select: {
            id: true,
            userProfile: {
              select: {
                display_name: true,
                bio: true,
                avatar_uri: true,
              },
            },
          },
        },
        // Selected only to satisfy validator completeness.
        editedBy: {
          select: {
            id: true,
            userProfile: {
              select: {
                display_name: true,
                bio: true,
                avatar_uri: true,
              },
            },
          },
        },
        deletedBy: {
          select: {
            id: true,
            userProfile: {
              select: {
                display_name: true,
                bio: true,
                avatar_uri: true,
              },
            },
          },
        },
        snapshots: {
          select: { id: true },
        },
        postImages: {
          select: { id: true },
        },
        linkMetadatum: {
          select: { id: true },
        },
        comments: {
          select: { deleted_at: true },
        },
        postVotes: {
          select: { vote_value: true, deleted_at: true },
        },
      },
    } satisfies Prisma.community_platform_postsFindManyArgs;
  }
  function timeSinceHuman(postedAtIso: string): string {
    const nowMs = Date.now();
    const postedAtMs = new Date(postedAtIso).getTime();
    const diffMs = nowMs - postedAtMs;
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    if (diffSec < 60) return `${diffSec} sec ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hr ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay} days ago`;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPost> {
    const voteScore = input.postVotes
      .filter((v) => v.deleted_at === null)
      .reduce((sum, v) => sum + Number(v.vote_value), 0);
    const commentsCount = input.comments.filter(
      (c) => c.deleted_at === null,
    ).length;
    const postedAtIso = toISOStringSafe(input.posted_at);
    const editedAtIso =
      input.edited_at === null ? null : toISOStringSafe(input.edited_at);
    const deletedAtIso =
      input.deleted_at === null ? null : toISOStringSafe(input.deleted_at);
    const createdAtIso = toISOStringSafe(input.created_at);
    const updatedAtIso = toISOStringSafe(input.updated_at);
    // DTO contract for this transformer currently models these fields as `null` only.
    const linkContent: null = null;
    const imageContent: null = null;
    const imageAltText: null = null;
    const communitySubscriberCount =
      input.community.communitySubscriptions.filter(
        (s) => s.is_active && s.deleted_at == null,
      ).length;
    const communityOwner = input.community.owner;
    const community: ICommunityPlatformCommunity.ISummary = {
      id: input.community
        .id as unknown as ICommunityPlatformCommunity.ISummary["id"],
      owner: {
        id: communityOwner.id as unknown as ICommunityPlatformMember.ISummary["id"],
        display_name:
          communityOwner.userProfile?.display_name ??
          `Member ${communityOwner.id}`,
        bio: communityOwner.userProfile?.bio ?? null,
        avatar_uri: communityOwner.userProfile?.avatar_uri ?? null,
      },
      name: input.community.name,
      description: input.community.description,
      icon_href: input.community.icon_href,
      subscriber_count:
        communitySubscriberCount as unknown as ICommunityPlatformCommunity.ISummary["subscriber_count"],
      created_at: input.community.created_at.toISOString(),
      updated_at: input.community.updated_at.toISOString(),
      deleted_at: input.community.deleted_at?.toISOString() ?? null,
    };
    const authorProfile = input.author.userProfile;
    const author: ICommunityPlatformMember.ISummary = {
      id: input.author.id as unknown as ICommunityPlatformMember.ISummary["id"],
      display_name: authorProfile?.display_name ?? `Member ${input.author.id}`,
      bio: authorProfile?.bio ?? null,
      avatar_uri: authorProfile?.avatar_uri ?? null,
    };
    return {
      id: input.id,
      community,
      author,
      title: input.title,
      postType: input.post_type,
      textContent: input.body,
      linkContent,
      imageContent,
      imageAltText,
      postedAt: postedAtIso,
      editedAt: editedAtIso,
      deletedAt: deletedAtIso,
      createdAt: createdAtIso,
      updatedAt: updatedAtIso,
      voteScore: voteScore as unknown as ICommunityPlatformPost["voteScore"],
      commentsCount:
        commentsCount as unknown as ICommunityPlatformPost["commentsCount"],
      timeSince: timeSinceHuman(postedAtIso),
    };
  }
}
