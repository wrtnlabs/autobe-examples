import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommunityBanCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommunityBan.ICreate;
    community: IEntity;
  }) {
    return {
      id: v4(),
      reason: props.body.reason,
      status: "active",
      started_at: new Date(props.body.started_at),
      expired_at:
        props.body.expired_at != null ? new Date(props.body.expired_at) : null,
      lifted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: {
        connect: {
          id: props.community.id,
        },
      },
      member: {
        connect: {
          id: props.body.community_platform_member_id,
        },
      },
    } satisfies Prisma.community_platform_community_bansCreateInput;
  }
}
