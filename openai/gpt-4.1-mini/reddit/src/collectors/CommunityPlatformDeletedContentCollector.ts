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
    communityPlatformModerators: IEntity;
    communityPlatformUsers: IEntity;
  }) {
    const id: string = v4();
    // Required field 'reason' is missing in DTO. Cannot complete without it
    throw new Error(
      "Cannot create CommunityPlatformDeletedContent without reason field in DTO.",
    );
    // Uncomment below if reason is provided in DTO or method signature modified
    // return {
    //   id,
    //   reason: props.body.reason,
    //   created_at: new Date(),
    //   updated_at: new Date(),
    //   deleted_at: null,
    //   moderator: { connect: { id: props.communityPlatformModerators.id } },
    //   user: { connect: { id: props.communityPlatformUsers.id } },
    //   post: undefined,
    //   comment: undefined,
    // } satisfies Prisma.community_platform_deleted_contentsCreateInput;
  }
}
