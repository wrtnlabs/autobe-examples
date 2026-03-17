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
    post: IEntity;
  }) {
    return {
      id: v4(),
      storage_uri: props.body.storage_uri,
      original_name: props.body.original_name,
      mime_type: props.body.mime_type,
      byte_size: props.body.byte_size,
      width: props.body.width ?? null,
      height: props.body.height ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      post: {
        connect: {
          id: props.post.id,
        },
      },
    } satisfies Prisma.community_platform_post_imagesCreateInput;
  }
}
