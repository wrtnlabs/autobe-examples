import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditClonePostTextContentCollector {
  export async function collect(props: {
    body: IRedditClonePostTextContent.ICreate;
    member: IEntity;
    community: IEntity;
  }) {
    return {
      id: v4(),
      created_at: new Date(),
      member: { connect: { id: props.member.id } },
      community: { connect: { id: props.body.community_id } },
    } satisfies Prisma.reddit_clone_subscriptionsCreateInput;
  }
}
