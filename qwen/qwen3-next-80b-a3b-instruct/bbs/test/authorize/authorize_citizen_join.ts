import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_citizen_join(
  connection: api.IConnection,
  props: {
    body?: IEconomicBoardCitizen.IJoin;
  },
): Promise<IEconomicBoardCitizen.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    display_name: props.body?.display_name ?? RandomGenerator.name(),
    bio:
      props.body?.bio ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
  } satisfies IEconomicBoardCitizen.IJoin;
  return await api.functional.economicBoard.auth.citizen.join(connection, {
    body: joinInput,
  });
}
