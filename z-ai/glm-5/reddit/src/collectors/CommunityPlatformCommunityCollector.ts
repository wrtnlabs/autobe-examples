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
      name: props.body.name,
      description: props.body.description,
      subscriber_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      owner: { connect: { id: props.member.id } },
      icon:
        props.body.iconFileId !== undefined && props.body.iconFileId !== null
          ? { connect: { id: props.body.iconFileId } }
          : undefined,
    } satisfies Prisma.community_platform_communitiesCreateInput;
  }
}
