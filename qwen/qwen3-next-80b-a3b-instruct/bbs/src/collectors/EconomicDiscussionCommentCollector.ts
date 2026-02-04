import { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EconomicDiscussionCommentCollector {
  export async function collect(props: {
    body: IEconomicDiscussionComment.ICreate;
    economicDiscussionCitizens: IEntity;
    economicDiscussionCitizenSessions: IEntity;
    economicDiscussionArticles: IEntity;
  }) {
    return {
      id: v4(),
      content: props.body.content,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      version: 1,
      status: "active",
      deletion_reason: null,
      article: {
        connect: { id: props.economicDiscussionArticles.id },
      },
      author: {
        connect: { id: props.economicDiscussionCitizens.id },
      },
      deletingAdministrator: undefined,
    } satisfies Prisma.economic_discussion_commentsCreateInput;
  }
}
