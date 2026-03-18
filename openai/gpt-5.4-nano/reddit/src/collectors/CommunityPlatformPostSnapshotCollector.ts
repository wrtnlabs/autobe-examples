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
    post: IEntity;
    community_id: string;
    author_user_id: string;
    post_type: string;
    editedByUser?: IEntity;
    deletedByUser?: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      post: { connect: { id: props.post.id } },
      community_id: props.community_id,
      author_user_id: props.author_user_id,
      post_type: props.post_type,
      title: props.body.title,
      body: props.body.body,
      link_url: props.body.linkUrl ?? null,
      edited_by_user_id: props.editedByUser?.id ?? null,
      deleted_by_user_id: props.deletedByUser?.id ?? null,
      published_at: new Date(props.body.publishedAt),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    } satisfies Prisma.community_platform_post_snapshotsCreateInput;
  }
}
