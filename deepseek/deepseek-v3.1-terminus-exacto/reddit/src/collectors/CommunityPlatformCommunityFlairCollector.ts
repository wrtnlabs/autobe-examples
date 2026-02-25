import { ICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlair";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommunityFlairCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommunityFlair.ICreate;
    communityPlatformCommunities: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      display_text: props.body.display_text,
      background_color: props.body.background_color ?? null,
      text_color: props.body.text_color ?? null,
      css_class: props.body.css_class ?? null,
      is_active: props.body.is_active ?? true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.communityPlatformCommunities.id } },
    } satisfies Prisma.community_platform_community_flairsCreateInput;
  }
}
