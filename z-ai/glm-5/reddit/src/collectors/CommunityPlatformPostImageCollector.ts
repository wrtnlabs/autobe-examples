import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformPostImageCollector {
  export async function collect(props: {
    body: ICommunityPlatformPostImage.ICreate;
    communityPlatformPosts: IEntity;
  }) {
    const id: string = v4();
    // Extract file ID from fileUrl pathname
    const url: URL = new URL(props.body.fileUrl);
    const fileId: string = url.pathname.split("/").filter(Boolean).pop()!;
    return {
      id,
      order: props.body.order ?? 0,
      created_at: new Date(),
      post: { connect: { id: props.communityPlatformPosts.id } },
      file: { connect: { id: fileId } },
    } satisfies Prisma.community_platform_post_imagesCreateInput;
  }
}
