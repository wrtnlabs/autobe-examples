import { ICommunitySystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunitySystemMessageCollector {
  export async function collect(props: {
    body: ICommunitySystemMessage.ICreate;
    communityAdmins: IEntity;
    communityAdminSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: "",
      content: "",
      created_at: new Date(),
      updated_at: new Date(),
      published_at: new Date(),
      visible_until: null,
      status: "draft",
    } satisfies Prisma.community_system_messagesCreateInput;
  }
}
