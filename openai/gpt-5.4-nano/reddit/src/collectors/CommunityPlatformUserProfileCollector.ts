import { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformUserProfileCollector {
  export async function collect(props: {
    body: ICommunityPlatformUserProfile.ICreate;
    communityPlatformMembers: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      display_name: props.body.display_name,
      bio: props.body.bio ?? null,
      avatar_uri: props.body.avatar_uri ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      member: {
        connect: { id: props.communityPlatformMembers.id },
      },
    } satisfies Prisma.community_platform_user_profilesCreateInput;
  }
}
