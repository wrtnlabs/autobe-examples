import { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformVoteCollector {
  export async function collect(props: {
    body: ICommunityPlatformVote.ICreate;
    member: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      direction: props.body.direction,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.member.id } },
    } satisfies Prisma.community_platform_votesCreateInput;
  }
}
