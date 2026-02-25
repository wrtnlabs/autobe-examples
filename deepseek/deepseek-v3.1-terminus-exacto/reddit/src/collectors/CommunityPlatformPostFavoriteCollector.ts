import { ICommunityPlatformPostFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostFavorite";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformPostFavoriteCollector {
  export async function collect(props: {
    body: ICommunityPlatformPostFavorite.ICreate;
    communityPlatformUsers: IEntity;
    communityPlatformPosts: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      user: { connect: { id: props.communityPlatformUsers.id } },
      post: { connect: { id: props.communityPlatformPosts.id } },
    } satisfies Prisma.community_platform_post_favoritesCreateInput;
  }
}
