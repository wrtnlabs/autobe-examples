import { ICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSortOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommentSortOrderCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommentSortOrder.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      strategy: props.body.strategy,
      sort_value: props.body.sortValue,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      comment: {
        connect: {
          id: props.body.communityPlatformCommentId,
        },
      },
    } satisfies Prisma.community_platform_comment_sort_ordersCreateInput;
  }
}
