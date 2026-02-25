import { ICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformDeletedContentCollector {
  export async function collect(props: {
    body: ICommunityPlatformDeletedContent.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      moderator: { connect: { id: props.body.moderator_id } },
      user: { connect: { id: props.body.user_id } },
      post: props.body.post_id
        ? { connect: { id: props.body.post_id } }
        : undefined,
      comment: props.body.comment_id
        ? { connect: { id: props.body.comment_id } }
        : undefined,
    } satisfies Prisma.community_platform_deleted_contentsCreateInput;
  }
}
