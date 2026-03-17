import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommunityCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommunity.ICreate;
    member: IEntity;
  }) {
    return {
      id: v4(),
      slug: props.body.slug,
      title: props.body.title,
      description: props.body.description,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: {
        connect: {
          id: props.member.id,
        },
      },
    } satisfies Prisma.community_platform_communitiesCreateInput;
  }
}
