import { ICommunityPlatformBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformBanSnapshotCollector {
  export async function collect(props: {
    body: ICommunityPlatformBanSnapshot.ICreate;
    ban: IEntity;
  }) {
    // Query the current ban state to copy into snapshot
    const ban = await MyGlobal.prisma.community_platform_bans.findFirstOrThrow({
      where: { id: props.ban.id },
    });
    const id: string = v4();
    return {
      // Scalar fields
      id,
      snapshot_reason: ban.reason,
      snapshot_banned_at: ban.banned_at,
      snapshot_expires_at: ban.expires_at,
      snapshot_unbanned_at: ban.unbanned_at,
      snapshot_active: ban.active,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relation
      ban: { connect: { id: props.ban.id } },
    } satisfies Prisma.community_platform_ban_snapshotsCreateInput;
  }
}
