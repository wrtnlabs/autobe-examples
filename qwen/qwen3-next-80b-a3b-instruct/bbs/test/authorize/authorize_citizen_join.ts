import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_citizen_join(
  connection: api.IConnection,
  props: {
    body: IEconomicDiscussionCitizen.IJoin;
  },
): Promise<IEconomicDiscussionCitizen.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? `${RandomGenerator.alphaNumeric(8)}@example.io`,
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    ip: props.body?.ip ?? null,
    href: props.body?.href ?? `https://${RandomGenerator.alphaNumeric(12)}.io`,
    referrer:
      props.body?.referrer ?? `https://${RandomGenerator.alphaNumeric(12)}.com`,
  } satisfies IEconomicDiscussionCitizen.IJoin;
  return await api.functional.economicDiscussion.auth.citizen.join(connection, {
    body: joinInput,
  });
}
