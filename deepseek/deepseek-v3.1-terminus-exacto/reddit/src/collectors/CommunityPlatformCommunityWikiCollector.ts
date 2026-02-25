import { ICommunityPlatformCommunityWiki } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityWiki";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommunityWikiCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommunityWiki.ICreate;
    communityPlatformCommunities: IEntity;
    communityPlatformUsers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      slug: props.body.slug,
      content: props.body.content,
      status: props.body.status ?? "draft",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.communityPlatformCommunities.id } },
      author: { connect: { id: props.communityPlatformUsers.id } },
    } satisfies Prisma.community_platform_community_wikisCreateInput;
  }
}
