import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformPostLinkCollector {
  export async function collect(props: {
    body: ICommunityPlatformPostLink.ICreate;
    communityPlatformPosts: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      href: props.body.href,
      display_title: props.body.displayTitle ?? "",
      display_description: props.body.displayDescription ?? "",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      post: {
        connect: { id: props.communityPlatformPosts.id },
      },
    } satisfies Prisma.community_platform_post_linksCreateInput;
  }
}
