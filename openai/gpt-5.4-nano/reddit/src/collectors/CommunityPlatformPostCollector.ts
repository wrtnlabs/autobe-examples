import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformPostCollector {
  export async function collect(props: {
    body: ICommunityPlatformPost.ICreate;
    communityPlatformMembers: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      title: props.body.title,
      body: props.body.body_text ?? "",
      post_type: props.body.post_type,
      link_url: props.body.link?.href ?? undefined,
      image_alt_text: props.body.image?.image_alt_text ?? null,
      image_cover_url: props.body.image?.image_cover_url ?? null,
      posted_at: now,
      edited_at: undefined,
      deleted_at: null,
      created_at: now,
      updated_at: now,
      community: { connect: { id: props.body.community_id } },
      author: { connect: { id: props.communityPlatformMembers.id } },
      editedBy: undefined,
      deletedBy: undefined,
      snapshots: undefined,
      postImages: undefined,
      linkMetadatum: undefined,
      comments: undefined,
      postVotes: undefined,
    } satisfies Prisma.community_platform_postsCreateInput;
  }
}
