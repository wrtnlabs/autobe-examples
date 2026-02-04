import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EconomicDiscussionArticleCollector {
  export async function collect(props: {
    body: IEconomicDiscussionArticle.ICreate;
    economicDiscussionCitizens: IEntity;
    economicDiscussionCitizenSessions: IEntity;
  }) {
    return {
      id: v4(),
      title: "",
      content: "",
      comment_count: 0,
      view_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      section: {
        connect: { id: props.economicDiscussionCitizens.id },
      },
      author: {
        connect: { id: props.economicDiscussionCitizens.id },
      },
    } satisfies Prisma.economic_discussion_articlesCreateInput;
  }
}
