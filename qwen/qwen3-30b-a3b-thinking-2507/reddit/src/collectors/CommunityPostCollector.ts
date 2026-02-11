import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPostCollector {
  export async function collect(props: {
    body: ICommunityPost.ICreate;
    communityCommunities: IEntity;
    communityMembers: IEntity;
  }) {
    return {
      id: v4(),
      title: props.body.title,
      type: props.body.type,
      content: props.body.content ?? null,
      url: props.body.url ?? null,
      image_url: props.body.image_url ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      author: { connect: { id: props.communityMembers.id } },
      community: { connect: { id: props.communityCommunities.id } },
    } satisfies Prisma.community_postsCreateInput;
  }
}
