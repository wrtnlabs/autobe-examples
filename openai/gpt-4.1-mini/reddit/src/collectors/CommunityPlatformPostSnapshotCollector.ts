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
  }) {
    const id: string = v4();
    return {
      id,
      title: "",
      content_text: null,
      content_url: null,
      content_image_url: null,
      post_type: "",
      author_user_id: "",
      community_id: "",
      vote_score: 0,
      comment_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      post: { connect: { id: props.post.id } },
    } satisfies Prisma.community_platform_post_snapshotsCreateInput;
  }
}
