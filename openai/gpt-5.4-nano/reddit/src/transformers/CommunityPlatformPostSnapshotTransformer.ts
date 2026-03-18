import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformPostSnapshotTransformer {
  export type Payload = Prisma.community_platform_post_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        post_id: true,
        community_id: true,
        author_user_id: true,
        post_type: true,
        title: true,
        body: true,
        link_url: true,
        edited_by_user_id: true,
        deleted_by_user_id: true,
        published_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_post_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPostSnapshot> {
    return {
      id: input.id,
      postId: input.post_id,
      communityId: input.community_id,
      authorUserId: input.author_user_id,
      postType: input.post_type,
      title: input.title,
      body: input.body,
      linkUrl: input.link_url ?? null,
      editedByUserId: input.edited_by_user_id ?? null,
      deletedByUserId: input.deleted_by_user_id ?? null,
      publishedAt: input.published_at.toISOString(),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
