import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizen";

export async function test_api_citizen_registration(
  connection: api.IConnection,
) {
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12);

  const output: IDiscussionBoardCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: {
        email,
        password,
      } satisfies IDiscussionBoardCitizen.ICreate,
    });
  typia.assert(output);
}
