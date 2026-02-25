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
  }) {
    const id: string = v4();
    return {
      id,
      url: props.body.url,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      post: { connect: { id: props.body.community_platform_post_id } },
    } satisfies Prisma.community_platform_post_linksCreateInput;
  }
}
