import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityCommunityCollector {
  export async function collect(props: {
    body: ICommunityCommunity.ICreate;
    communityMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      icon_url: props.body.icon_url ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      owner: { connect: { id: props.communityMembers.id } },
    } satisfies Prisma.community_communitiesCreateInput;
  }
}
