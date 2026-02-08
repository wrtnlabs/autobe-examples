import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommunityBanCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommunityBan.ICreate & {
      bannedAt?: Date | null | undefined;
      unbannedAt?: Date | null | undefined;
      reason?: string | null | undefined;
    };
    community: IEntity;
    user: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      banned_at: props.body.bannedAt ?? new Date(),
      unbanned_at: props.body.unbannedAt ?? null,
      reason: props.body.reason ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.community.id } },
      user: { connect: { id: props.user.id } },
    } satisfies Prisma.community_platform_community_bansCreateInput;
  }
}
