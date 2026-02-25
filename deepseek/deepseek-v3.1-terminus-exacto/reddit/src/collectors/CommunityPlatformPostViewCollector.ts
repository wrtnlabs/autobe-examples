import { ICommunityPlatformPostView } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostView";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformPostViewCollector {
  export async function collect(props: {
    body: ICommunityPlatformPostView.ICreate;
    post: IEntity;
    user: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      ip_address: props.body.ip_address ?? null,
      user_agent: props.body.user_agent ?? null,
      referrer: props.body.referrer ?? null,
      view_duration: props.body.view_duration ?? null,
      post: { connect: { id: props.post.id } },
      user: props.user ? { connect: { id: props.user.id } } : undefined,
    } satisfies Prisma.community_platform_post_viewsCreateInput;
  }
}
