import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
    return {
      id: v4(),
      title: props.body.title,
      content_type: props.body.contentType,
      text_content: props.body.textContent ?? null,
      link_url: props.body.linkUrl ?? null,
      image_url: props.body.imageUrl ?? null,
      score: 0,
      comment_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.body.communityId } },
      author: { connect: { id: props.communityPlatformMembers.id } },
      postImages: undefined,
      snapshots: undefined,
      comments: undefined,
      postReports: undefined,
      votes: undefined,
      imageFiles: undefined,
    } satisfies Prisma.community_platform_postsCreateInput;
  }
}
