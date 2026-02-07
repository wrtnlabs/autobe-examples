import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPostCollector {
  export async function collect(props: {
    body: ICommunityPost.ICreate;
    communityMembers: IEntity;
    communityMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: "",
      content_type: "text",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      author: { connect: { id: props.communityMembers.id } },
      community: { connect: { id: props.communityMemberSessions.id } },
      status: { connect: { id: "approved" } },
    } satisfies Prisma.community_postsCreateInput;
  }
}
