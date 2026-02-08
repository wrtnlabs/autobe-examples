import { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

function toISOStringSafe(date: Date | null | undefined): string | null {
  if (date === null || date === undefined) return null;
  return date.toISOString();
}
export namespace CommunityPlatformBannedUserCollector {
  export async function collect(props: {
    body: ICommunityPlatformBannedUser.ICreate;
    user: IEntity;
    community: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      banned_at: toISOStringSafe(new Date())!,
      unbanned_at: null,
      reason: "",
      created_at: toISOStringSafe(new Date())!,
      updated_at: toISOStringSafe(new Date())!,
      deleted_at: null,
      user: { connect: { id: props.user.id } },
      community: { connect: { id: props.community.id } },
    } satisfies Prisma.community_platform_banned_usersCreateInput;
  }
}
