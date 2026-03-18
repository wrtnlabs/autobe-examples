import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformPostAtSummaryTransformer {
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
        // Selected to satisfy transformer schema inventory (not used by DTO directly)
        community: { select: { id: true } },
        author: CommunityPlatformMemberAtSummaryTransformer.select(),
        editedBy: CommunityPlatformMemberAtSummaryTransformer.select(),
        deletedBy: CommunityPlatformMemberAtSummaryTransformer.select(),
        // Selected to satisfy transformer schema inventory (not used by DTO directly)
        snapshots: { select: { id: true } },
        postImages: { select: { id: true } },
        linkMetadatum: { select: { id: true } },
        comments: { select: { id: true } },
        postVotes: { select: { id: true } },
      },
    } satisfies Prisma.community_platform_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPost.ISummary> {
    return {
      id: input.id,
      title: input.title,
      body: input.body,
      postType: input.post_type,
      linkUrl: input.link_url,
      imageAltText: input.image_alt_text,
      imageCoverUrl: input.image_cover_url,
      postedAt: input.posted_at.toISOString(),
      editedAt: input.edited_at?.toISOString() ?? null,
      deletedAt: input.deleted_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      author: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      editedBy: input.editedBy
        ? await CommunityPlatformMemberAtSummaryTransformer.transform(
            input.editedBy,
          )
        : null,
      deletedBy: input.deletedBy
        ? await CommunityPlatformMemberAtSummaryTransformer.transform(
            input.deletedBy,
          )
        : null,
    };
  }
}
