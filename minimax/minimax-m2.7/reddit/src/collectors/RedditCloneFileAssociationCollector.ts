import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneFileAssociationCollector {
  export async function collect(props: {
    body: IRedditCloneFileAssociation.ICreate;
    member: IEntity;
    session: IEntity;
  }) {
    return {
      id: v4(),
      target_type: props.body.targetType,
      target_id: props.body.targetId,
      created_at: new Date(),
      updated_at: new Date(),
      file: {
        connect: {
          id: props.body.redditCloneFileId,
        },
      },
    } satisfies Prisma.reddit_clone_file_associationsCreateInput;
  }
}
