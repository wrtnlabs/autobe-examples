import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPost";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EconomicForumPostCollector {
  export async function collect(props: {
    body: IEconomicForumPost.ICreate;
    economicForumUsers: IEntity; // from authorized actor
    economicForumUserSessions: IEntity; // from authorized session
  }) {
    return {
      id: v4(),
      title: "",
      body: "",
      status: "draft",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      user: {
        connect: { id: props.economicForumUsers.id },
      },
      admin: undefined,
    } satisfies Prisma.economic_forum_postsCreateInput;
  }
}
