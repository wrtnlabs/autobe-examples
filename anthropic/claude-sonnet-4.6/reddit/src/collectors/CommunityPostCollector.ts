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
    communityMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      type: props.body.type,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      author: { connect: { id: props.communityMembers.id } },
      community: { connect: { id: props.communityCommunities.id } },
      // HasOne type-specific payloads (discriminated union)
      text:
        props.body.type === "text"
          ? {
              create: {
                id: v4(),
                body: props.body.body,
              },
            }
          : undefined,
      link:
        props.body.type === "link"
          ? {
              create: {
                id: v4(),
                url: props.body.url,
                domain: new URL(props.body.url).hostname,
              },
            }
          : undefined,
      imagePayload:
        props.body.type === "image"
          ? {
              create: {
                id: v4(),
                image_url: props.body.image_url,
                thumbnail_url: props.body.thumbnail_url,
              },
            }
          : undefined,
    } satisfies Prisma.community_postsCreateInput;
  }
}
