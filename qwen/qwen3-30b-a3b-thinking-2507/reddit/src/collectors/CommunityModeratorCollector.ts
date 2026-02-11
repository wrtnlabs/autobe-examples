import { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityModeratorCollector {
  export async function collect(props: {
    body: ICommunityModerator.ICreate;
    communityCommunities: IEntity;
  }) {
    const id = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      is_owner: props.body.is_owner,
      user: { connect: { id: props.body.user_id } },
      community: { connect: { id: props.communityCommunities.id } },
    } satisfies Prisma.community_moderatorsCreateInput;
  }
}
