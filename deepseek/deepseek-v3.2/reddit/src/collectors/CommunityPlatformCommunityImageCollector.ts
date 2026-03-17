import { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommunityImageCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommunityImage.ICreate;
    community: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields from DTO
      id,
      uri: props.body.uri,
      filename: props.body.filename,
      content_type: props.body.content_type,
      width: props.body.width,
      height: props.body.height,
      size_bytes: props.body.size_bytes,
      ordering: props.body.ordering,
      active: props.body.active,
      // Timestamps
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relation
      community: { connect: { id: props.community.id } },
    } satisfies Prisma.community_platform_community_imagesCreateInput;
  }
}
