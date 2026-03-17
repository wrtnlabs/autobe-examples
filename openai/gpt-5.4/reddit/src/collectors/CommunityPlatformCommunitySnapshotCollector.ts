import { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommunitySnapshotCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommunitySnapshot.ICreate;
    community: IEntity;
  }) {
    return {
      id: v4(),
      visibility: props.body.visibility,
      created_at: new Date(),
      deleted_at: null,
      community: {
        connect: {
          id: props.community.id,
        },
      },
    } satisfies Prisma.community_platform_community_snapshotsCreateInput;
  }
}
