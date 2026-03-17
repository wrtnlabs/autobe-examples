import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformPostSnapshotCollector {
  export async function collect(props: {
    body: ICommunityPlatformPostSnapshot.ICreate;
  }) {
    // First, query the post to get its current state for snapshot fields
    const post =
      await MyGlobal.prisma.community_platform_posts.findFirstOrThrow({
        where: { id: props.body.community_platform_post_id },
      });
    const id: string = v4();
    return {
      // Generate new snapshot ID
      id,
      // Copy all current post state to snapshot fields
      snapshot_title: post.title,
      snapshot_content_type: post.content_type,
      snapshot_community_platform_member_id: post.community_platform_member_id,
      snapshot_community_platform_community_id:
        post.community_platform_community_id,
      snapshot_created_at: post.created_at,
      snapshot_updated_at: post.updated_at ?? null,
      snapshot_deleted_at: post.deleted_at ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      post: { connect: { id: props.body.community_platform_post_id } },
    } satisfies Prisma.community_platform_post_snapshotsCreateInput;
  }
}
