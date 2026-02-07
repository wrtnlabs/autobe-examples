import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunityRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPlatformCommunityRoleCollector {
  export async function collect(props: {
    body: IRedditPlatformCommunityRole.ICreate;
    community: IEntity;
    user: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      role: "moderator",
      created_at: new Date(),
      updated_at: new Date(),
      user: { connect: { id: props.user.id } },
      community: { connect: { id: props.community.id } },
    } satisfies Prisma.reddit_platform_community_rolesCreateInput;
  }
}
