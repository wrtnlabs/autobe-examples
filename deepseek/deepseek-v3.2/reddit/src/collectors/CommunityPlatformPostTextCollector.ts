import { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformPostTextCollector {
  export async function collect(props: {
    body: ICommunityPlatformPostText.ICreate;
    post: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      content: props.body.content,
      formatting: props.body.formatting ?? "plain",
      content_length: props.body.content.length,
      deleted_at: null,
      post: { connect: { id: props.post.id } },
    } satisfies Prisma.community_platform_post_textsCreateInput;
  }
}
