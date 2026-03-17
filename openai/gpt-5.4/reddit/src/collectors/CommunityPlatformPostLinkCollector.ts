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
    post: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    const domain_display: string = (() => {
      try {
        const hostname: string = new URL(
          props.body.target_url,
        ).hostname.toLowerCase();
        return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
      } catch {
        return props.body.target_url.toLowerCase();
      }
    })();
    return {
      id,
      target_url: props.body.target_url,
      domain_display,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      post: {
        connect: {
          id: props.post.id,
        },
      },
    } satisfies Prisma.community_platform_post_linksCreateInput;
  }
}
