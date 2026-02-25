import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body: IEconomicPoliticalDiscussionBoardGuest.IJoin;
  },
): Promise<IEconomicPoliticalDiscussionBoardGuest.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? `${RandomGenerator.name()}@example.com`,
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
  };
  return await api.functional.economicPoliticalDiscussionBoard.auth.guest.join(
    connection,
    { body: joinInput },
  );
}
