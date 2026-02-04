import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_economic_discussion_comment } from "../prepare/prepare_random_economic_discussion_comment";

export async function generate_random_economic_discussion_citizen_articles_comments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomicDiscussionComment.ICreate> | undefined;
    params: {
      articleId: string;
    };
  },
): Promise<IEconomicDiscussionComment> {
  const prepared: IEconomicDiscussionComment.ICreate =
    prepare_random_economic_discussion_comment(props.body);
  return await api.functional.economicDiscussion.citizen.articles.comments.create(
    connection,
    {
      articleId: props.params.articleId,
      body: prepared,
    },
  );
}
