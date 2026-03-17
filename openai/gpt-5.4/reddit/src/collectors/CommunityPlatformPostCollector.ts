import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { CommunityPlatformPostImageCollector } from "./CommunityPlatformPostImageCollector";
import { CommunityPlatformPostLinkCollector } from "./CommunityPlatformPostLinkCollector";
import { CommunityPlatformPostTextCollector } from "./CommunityPlatformPostTextCollector";

export namespace CommunityPlatformPostCollector {
  export async function collect(props: {
    body: ICommunityPlatformPost.ICreate;
    member: IEntity;
  }) {
    const id: string = v4();
    const post: IEntity = { id };
    const now: Date = new Date();
    return {
      id,
      title: props.body.title,
      post_type: props.body.post_type,
      status: "active",
      created_at: now,
      updated_at: now,
      deleted_at: null,
      author: {
        connect: { id: props.member.id },
      },
      community: {
        connect: { id: props.body.community_platform_community_id },
      },
      postImage: props.body.postImage
        ? {
            create: await CommunityPlatformPostImageCollector.collect({
              body: props.body.postImage,
              post,
            }),
          }
        : undefined,
      textContent: props.body.textContent
        ? {
            create: await CommunityPlatformPostTextCollector.collect({
              body: props.body.textContent,
              post,
            }),
          }
        : undefined,
      link: props.body.link
        ? {
            create: await CommunityPlatformPostLinkCollector.collect({
              body: props.body.link,
              post,
            }),
          }
        : undefined,
    } satisfies Prisma.community_platform_postsCreateInput;
  }
}
