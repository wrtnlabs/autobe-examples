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
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      content_text: props.body.contentText ?? null,
      content_url: props.body.contentUrl ?? null,
      content_image_url: props.body.contentImageUrl ?? null,
      post_type: props.body.postType,
      author_user_id: props.body.authorUserId,
      community_id: props.body.communityId,
      vote_score: props.body.voteScore,
      comment_count: props.body.commentCount,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      post: { connect: { id: props.body.communityPlatformPostId } },
    } satisfies Prisma.community_platform_post_snapshotsCreateInput;
  }
}
