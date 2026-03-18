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
    communityPlatformPosts: IEntity; // from path parameter postId
  }) {
    const id: string = v4();
    return {
      id,
      file_url: props.body.file_url,
      content_type: props.body.content_type,
      file_size_bytes: props.body.file_size_bytes,
      image_width_px: props.body.image_width_px,
      image_height_px: props.body.image_height_px,
      alt_text: props.body.alt_text,
      sort_order: props.body.sort_order,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      post: {
        connect: { id: props.communityPlatformPosts.id },
      },
    } satisfies Prisma.community_platform_post_imagesCreateInput;
  }
}
