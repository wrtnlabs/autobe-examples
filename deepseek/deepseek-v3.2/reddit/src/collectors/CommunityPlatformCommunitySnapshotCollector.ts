import { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommunitySnapshotCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommunitySnapshot.ICreate;
    community: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      code: props.body.code,
      name: props.body.name,
      description: props.body.description,
      type: props.body.type,
      status: props.body.status,
      visibility: props.body.visibility,
      is_nsfw: props.body.is_nsfw,
      is_archived: props.body.is_archived,
      is_locked: props.body.is_locked,
      member_count: props.body.member_count,
      subscriber_count: props.body.subscriber_count,
      post_count: props.body.post_count,
      comment_count: props.body.comment_count,
      owner_member_id: props.body.owner_member_id,
      created_at: new Date(),
      // BelongsTo relations
      community: { connect: { id: props.community.id } },
    } satisfies Prisma.community_platform_community_snapshotsCreateInput;
  }
}
