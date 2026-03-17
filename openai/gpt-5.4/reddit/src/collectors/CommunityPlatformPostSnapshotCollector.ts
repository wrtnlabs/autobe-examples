import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformPostSnapshotCollector {
  export async function collect(props: {
    body: ICommunityPlatformPostSnapshot.ICreate;
    post: IEntity;
  }) {
    const latest =
      await MyGlobal.prisma.community_platform_post_snapshots.findFirst({
        where: {
          community_platform_post_id: props.post.id,
        },
        orderBy: {
          revision_no: "desc",
        },
      });
    const revision_no: number = (latest?.revision_no ?? 0) + 1;
    return {
      id: v4(),
      revision_no,
      visibility_state: props.body.visibility_state,
      created_at: new Date(),
      post: {
        connect: {
          id: props.post.id,
        },
      },
    } satisfies Prisma.community_platform_post_snapshotsCreateInput;
  }
}
