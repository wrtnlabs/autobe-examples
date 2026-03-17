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
    communityPlatformCommunities: IEntity;
    communityPlatformMembers: IEntity;
    communityPlatformMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      post_type: props.body.postType,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      author: { connect: { id: props.communityPlatformMembers.id } },
      community: { connect: { id: props.communityPlatformCommunities.id } },
      textContent:
        props.body.postType === "text" && props.body.content !== undefined
          ? {
              create: {
                id: v4(),
                content: props.body.content,
                created_at: new Date(),
                updated_at: new Date(),
              },
            }
          : undefined,
      linkUrl:
        props.body.postType === "link" && props.body.url !== undefined
          ? {
              create: {
                id: v4(),
                url: props.body.url,
                domain: new URL(props.body.url).hostname,
                created_at: new Date(),
                updated_at: new Date(),
              },
            }
          : undefined,
    } satisfies Prisma.community_platform_postsCreateInput;
  }
}
